package expo.modules.pacelan

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import okhttp3.ConnectionSpec
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.TlsVersion
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.math.BigInteger
import java.net.Socket
import java.net.Proxy
import java.net.URI
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Principal
import java.security.PrivateKey
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import java.security.spec.ECGenParameterSpec
import java.util.Date
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong
import javax.net.ssl.KeyManager
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLEngine
import javax.net.ssl.X509ExtendedKeyManager
import javax.net.ssl.X509TrustManager
import javax.security.auth.x500.X500Principal

/** LAN-only transport. The verified certificate fingerprint, never mDNS, establishes trust. */
class PaceLanModule : Module() {
  companion object {
    private const val MAX_BYTES = 1024 * 1024
    private const val SERVICE_TYPE = "_pace-remote._tcp."
  }

  private val lock = Any()
  private val generation = AtomicLong()
  private val clients = ConcurrentHashMap.newKeySet<OkHttpClient>()
  @Volatile private var destroyed = false
  private var socket: WebSocket? = null
  private var connected = false
  private var socketClient: OkHttpClient? = null
  private var discovery: NsdManager.DiscoveryListener? = null
  private var nsd: NsdManager? = null

  override fun definition() = ModuleDefinition {
    Name("PaceLan")
    Events("message", "state", "host")

    AsyncFunction("pair") { address: String, fingerprint: String, token: String, name: String ->
      try {
        require(token.length in 1..1024 && name.length in 1..128)
        val endpoint = endpoint(address)
        val pin = fingerprint(fingerprint)
        val client = client(pin, createIdentity = true)
        try {
          val json = JSONObject().put("v", 1).put("token", token).put("name", name).toString()
          val request = Request.Builder().url("$endpoint/pair")
            .post(json.toRequestBody("application/json".toMediaType())).build()
          client.newCall(request).execute().use { response ->
            check(response.isSuccessful)
            val body = checkNotNull(response.body)
            require(body.contentLength() <= MAX_BYTES)
            body.byteStream().use { stream ->
              val bytes = ByteArrayOutputStream()
              val buffer = ByteArray(8192)
              var count = stream.read(buffer)
              while (count != -1) {
                require(bytes.size() + count <= MAX_BYTES)
                bytes.write(buffer, 0, count)
                count = stream.read(buffer)
              }
              bytes.toString(Charsets.UTF_8.name())
            }
          }
        } finally {
          dispose(client)
        }
      } catch (_: Exception) {
        // Network/provider errors can include URLs or pairing credentials. Never bridge them.
        throw IllegalStateException("Pairing failed")
      }
    }

    AsyncFunction("connect") { address: String, fingerprint: String ->
      synchronized(lock) {
        try {
          val endpoint = endpoint(address)
          val pin = fingerprint(fingerprint)
          disconnectSocket()
          val ticket = generation.incrementAndGet()
          val client = client(pin, createIdentity = false)
          val request = Request.Builder().url("${endpoint.replaceFirst("https://", "wss://")}/remote")
            .header("Sec-WebSocket-Protocol", "pace-remote-v1").build()
          check(!destroyed)
          socketClient = client
          socket = client.newWebSocket(request, listener(ticket))
        } catch (_: Exception) {
          disconnectSocket()
          state("error")
          throw IllegalStateException("Connection failed")
        }
      }
    }

    AsyncFunction("send") { message: String ->
      require(message.toByteArray(Charsets.UTF_8).size <= MAX_BYTES) { "Message too large" }
      synchronized(lock) {
        val active = socket
        check(connected && active != null) { "Host disconnected" }
        check(active.queueSize() + message.toByteArray(Charsets.UTF_8).size <= MAX_BYTES) {
          "Transport busy"
        }
        check(active.send(message)) { "Host disconnected" }
      }
    }

    AsyncFunction("disconnect") {
      disconnectSocket()
      state("disconnected")
    }
    AsyncFunction("discover") { startDiscovery() }
    AsyncFunction("stopDiscovery") { stopDiscovery() }

    OnDestroy {
      destroyed = true
      stopDiscovery()
      disconnectSocket()
      clients.toList().forEach { dispose(it) }
    }
  }

  private fun listener(ticket: Long) = object : WebSocketListener() {
    override fun onOpen(webSocket: WebSocket, response: Response) {
      if (response.header("Sec-WebSocket-Protocol") != "pace-remote-v1") {
        webSocket.cancel()
        fail(ticket)
        return
      }
      synchronized(lock) {
        if (destroyed || generation.get() != ticket) {
          webSocket.cancel()
          return
        }
        connected = true
        state("connected")
      }
    }

    override fun onMessage(webSocket: WebSocket, text: String) {
      if (generation.get() != ticket || destroyed) return
      if (text.toByteArray(Charsets.UTF_8).size > MAX_BYTES) {
        webSocket.cancel()
        fail(ticket)
      } else {
        sendEvent("message", mapOf("text" to text))
      }
    }

    override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
      // The protocol accepts JSON text frames only.
      webSocket.cancel()
      fail(ticket)
    }

    override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
      webSocket.close(1000, null)
    }

    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
      synchronized(lock) {
        if (generation.get() == ticket) {
          disconnectSocket()
          state("disconnected")
        }
      }
    }

    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
      fail(ticket)
    }
  }

  private fun fail(ticket: Long) = synchronized(lock) {
    if (generation.get() != ticket) return@synchronized
    disconnectSocket()
    state("error")
  }

  private fun state(status: String) {
    if (!destroyed) sendEvent("state", mapOf("status" to status))
  }

  private fun disconnectSocket() = synchronized(lock) {
    generation.incrementAndGet()
    connected = false
    socket?.cancel()
    socket = null
    socketClient?.let { dispose(it) }
    socketClient = null
  }

  private fun dispose(client: OkHttpClient) {
    clients.remove(client)
    client.dispatcher.cancelAll()
    client.connectionPool.evictAll()
    client.dispatcher.executorService.shutdown()
  }

  private fun endpoint(address: String): String {
    val uri = URI(address)
    require(uri.scheme == "https" && uri.rawUserInfo == null && uri.rawQuery == null &&
      uri.rawFragment == null && uri.rawPath.isNullOrEmpty() && uri.port in 1..65535 &&
      privateIpv4(uri.host)) { "Use an HTTPS private IPv4 address with explicit port" }
    return "https://${uri.host}:${uri.port}"
  }

  private fun privateIpv4(host: String?): Boolean {
    if (host == null || !host.matches(Regex("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+"))) return false
    val pieces = host.split('.')
    if (pieces.any { it.length > 1 && it.startsWith('0') }) return false
    val parts = pieces.map { it.toIntOrNull() ?: return false }
    if (parts.any { it !in 0..255 }) return false
    return parts[0] == 10 || (parts[0] == 172 && parts[1] in 16..31) ||
      (parts[0] == 192 && parts[1] == 168)
  }

  private fun fingerprint(value: String): String {
    val normalized = value.replace(":", "").lowercase()
    require(normalized.matches(Regex("[a-f0-9]{64}"))) { "Invalid host fingerprint" }
    return normalized
  }

  private fun client(pin: String, createIdentity: Boolean): OkHttpClient {
    val alias = "pace-remote-$pin"
    val store = synchronized(lock) {
      check(!destroyed)
      val keys = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      if (!keys.containsAlias(alias)) {
        check(createIdentity) { "Pair this host first" }
        val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
        generator.initialize(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA384, KeyProperties.DIGEST_SHA512)
          .setCertificateSubject(X500Principal("CN=Pace Remote"))
          .setCertificateSerialNumber(BigInteger.ONE)
          .setCertificateNotBefore(Date(System.currentTimeMillis() - TimeUnit.DAYS.toMillis(1)))
          .setCertificateNotAfter(Date(System.currentTimeMillis() + TimeUnit.DAYS.toMillis(3650)))
          .build())
        generator.generateKeyPair()
      }
      keys
    }
    val certificate = store.getCertificate(alias) as X509Certificate
    val privateKey = store.getKey(alias, null) as PrivateKey
    val trust = object : X509TrustManager {
      override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
      override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {
        throw CertificateException("Client trust unavailable")
      }
      override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {
        val server = chain?.firstOrNull() ?: throw CertificateException("Missing certificate")
        server.checkValidity()
        val digest = MessageDigest.getInstance("SHA-256").digest(server.encoded)
        val expected = pin.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        if (!MessageDigest.isEqual(digest, expected)) throw CertificateException("Host pin mismatch")
      }
    }
    val identity = object : X509ExtendedKeyManager() {
      override fun getClientAliases(keyType: String?, issuers: Array<out Principal>?) =
        if (keyType == "EC") arrayOf(alias) else null
      override fun chooseClientAlias(keyType: Array<out String>?, issuers: Array<out Principal>?, socket: Socket?) =
        if (keyType?.contains("EC") == true) alias else null
      override fun chooseEngineClientAlias(keyType: Array<out String>?, issuers: Array<out Principal>?, engine: SSLEngine?) =
        if (keyType?.contains("EC") == true) alias else null
      override fun getServerAliases(keyType: String?, issuers: Array<out Principal>?): Array<String>? = null
      override fun chooseServerAlias(keyType: String?, issuers: Array<out Principal>?, socket: Socket?): String? = null
      override fun getCertificateChain(requestedAlias: String?): Array<X509Certificate>? =
        if (requestedAlias == alias) arrayOf(certificate) else null
      override fun getPrivateKey(requestedAlias: String?): PrivateKey? =
        if (requestedAlias == alias) privateKey else null
    }
    val tls = SSLContext.getInstance("TLSv1.3")
    tls.init(arrayOf<KeyManager>(identity), arrayOf(trust), null)
    val client = OkHttpClient.Builder()
      .sslSocketFactory(tls.socketFactory, trust)
      // Exact out-of-band certificate pin replaces hostname PKI for the private literal address.
      .hostnameVerifier { _, session ->
        try {
          trust.checkServerTrusted(session.peerCertificates.map { it as X509Certificate }.toTypedArray(), "EC")
          true
        } catch (_: Exception) { false }
      }
      .connectionSpecs(listOf(ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS).tlsVersions(TlsVersion.TLS_1_3).build()))
      .protocols(listOf(Protocol.HTTP_1_1))
      .proxy(Proxy.NO_PROXY)
      .followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false)
      .connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS)
      .writeTimeout(10, TimeUnit.SECONDS).callTimeout(10, TimeUnit.SECONDS)
      .pingInterval(20, TimeUnit.SECONDS).build()
    synchronized(lock) {
      if (destroyed) {
        dispose(client)
        error("Module unavailable")
      }
      clients.add(client)
    }
    return client
  }

  @Suppress("DEPRECATION")
  private fun startDiscovery() = synchronized(lock) {
    check(!destroyed)
    if (discovery != null) return@synchronized
    val context = checkNotNull(appContext.reactContext)
    val manager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    nsd = manager
    val listener = object : NsdManager.DiscoveryListener {
      override fun onDiscoveryStarted(type: String) = Unit
      override fun onDiscoveryStopped(type: String) = Unit
      override fun onStartDiscoveryFailed(type: String, code: Int) {
        synchronized(lock) { if (discovery === this) discovery = null }
        state("error")
      }
      override fun onStopDiscoveryFailed(type: String, code: Int) = Unit
      override fun onServiceLost(service: NsdServiceInfo) = Unit
      override fun onServiceFound(service: NsdServiceInfo) {
        val active = this
        if (service.serviceType.trimEnd('.') != SERVICE_TYPE.trimEnd('.')) return
        try { manager.resolveService(service, object : NsdManager.ResolveListener {
          override fun onResolveFailed(info: NsdServiceInfo, code: Int) = Unit
          override fun onServiceResolved(info: NsdServiceInfo) {
            val host = info.host?.hostAddress
            synchronized(lock) {
              if (destroyed || discovery !== active || !privateIpv4(host) || info.port !in 1..65535) return
              sendEvent("host", mapOf("name" to info.serviceName, "address" to "https://$host:${info.port}"))
            }
          }
        }) } catch (_: Exception) { state("error") }
      }
    }
    discovery = listener
    try {
      manager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
    } catch (_: Exception) {
      discovery = null
      throw IllegalStateException("Discovery unavailable")
    }
  }

  private fun stopDiscovery() = synchronized(lock) {
    val active = discovery
    discovery = null
    if (active != null) {
      try { nsd?.stopServiceDiscovery(active) } catch (_: Exception) { /* Already stopped. */ }
    }
  }
}
