#!/usr/bin/env node

const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');

// -------------------- UTIL --------------------

function formatTime(ms) {
  return ms.toFixed(2) + " ms";
}

function hrtimeToMs(start, end) {
  return Number(end - start) / 1e6;
}

// -------------------- STEP 1: URL PARSE --------------------

function parseURL(input) {
  let url;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL format");
  }

  return {
    scheme: url.protocol.replace(':', ''),
    host: url.hostname,
    port: url.port
      ? parseInt(url.port)
      : (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname || '/'
  };
}

// -------------------- STEP 2: DNS --------------------

async function resolveDNS(host) {
  const start = process.hrtime.bigint();

  const [ipv4, ipv6] = await Promise.allSettled([
    dns.resolve4(host),
    dns.resolve6(host)
  ]);

  const end = process.hrtime.bigint();

  if (ipv4.status === 'rejected' && ipv6.status === 'rejected') {
    throw new Error("DNS resolution failed");
  }

  return {
    ipv4: ipv4.status === 'fulfilled' ? ipv4.value : [],
    ipv6: ipv6.status === 'fulfilled' ? ipv6.value : [],
    time: hrtimeToMs(start, end)
  };
}

// -------------------- STEP 3: TCP --------------------

function tcpConnect(ip, port) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();

    const socket = net.createConnection({ host: ip, port });

    socket.on('connect', () => {
      const end = process.hrtime.bigint();

      resolve({
        socket,
        time: hrtimeToMs(start, end)
      });
    });

    socket.on('error', (err) => {
      reject(new Error(`TCP error: ${err.code || err.message}`));
    });
  });
}

// -------------------- STEP 4: TLS --------------------

function tlsHandshake(socket, host) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();

    const tlsSocket = tls.connect({
      socket,
      servername: host
    }, () => {
      const end = process.hrtime.bigint();

      const cert = tlsSocket.getPeerCertificate();

      resolve({
        socket: tlsSocket,
        time: hrtimeToMs(start, end),
        cert: {
          subject: cert.subject?.CN || "N/A",
          issuer: cert.issuer?.CN || "N/A",
          valid_to: cert.valid_to || "N/A"
        }
      });
    });

    tlsSocket.on('error', (err) => {
      reject(new Error(`TLS error: ${err.message}`));
    });
  });
}

// -------------------- STEP 5: HTTP --------------------

function httpRequest(socket, parsed) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();

    const request =
      `GET ${parsed.path} HTTP/1.1\r\n` +
      `Host: ${parsed.host}\r\n` +
      `Connection: close\r\n\r\n`;

    socket.write(request);

    socket.once('data', (chunk) => {
      const end = process.hrtime.bigint();

      const response = chunk.toString();

      const lines = response.split('\r\n');
      const statusLine = lines[0];
      const headers = lines.slice(1).filter(line => line !== '');

      resolve({
        time: hrtimeToMs(start, end),
        status: statusLine,
        headers
      });
    });

    socket.on('error', (err) => {
      reject(new Error(`HTTP error: ${err.message}`));
    });
  });
}

// -------------------- MAIN PIPELINE --------------------

async function main() {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: node script.js <URL>");
    process.exit(1);
  }

  try {
    console.log("\n--- URL INFO ---");
    const parsed = parseURL(input);
    console.log(`Scheme: ${parsed.scheme}`);
    console.log(`Host:   ${parsed.host}`);
    console.log(`Port:   ${parsed.port}`);
    console.log(`Path:   ${parsed.path}`);

    console.log("\n--- DNS LOOKUP ---");
    const dnsResult = await resolveDNS(parsed.host);
    console.log(`IPv4: ${dnsResult.ipv4.join(', ') || 'None'}`);
    console.log(`IPv6: ${dnsResult.ipv6.join(', ') || 'None'}`);
    console.log(`Time: ${formatTime(dnsResult.time)}`);

    const ip = dnsResult.ipv4[0] || dnsResult.ipv6[0];
    if (!ip) throw new Error("No IP address found");

    console.log("\n--- TCP CONNECTION ---");
    const tcpResult = await tcpConnect(ip, parsed.port);
    console.log(`Connected to ${ip}`);
    console.log(`Time: ${formatTime(tcpResult.time)}`);

    let activeSocket = tcpResult.socket;

    if (parsed.scheme === 'https') {
      console.log("\n--- TLS HANDSHAKE ---");

      const tlsResult = await tlsHandshake(activeSocket, parsed.host);
      activeSocket = tlsResult.socket;

      console.log(`Time: ${formatTime(tlsResult.time)}`);
      console.log(`Subject: ${tlsResult.cert.subject}`);
      console.log(`Issuer: ${tlsResult.cert.issuer}`);
      console.log(`Valid To: ${tlsResult.cert.valid_to}`);
    }

    console.log("\n--- HTTP REQUEST ---");
    const httpResult = await httpRequest(activeSocket, parsed);

    console.log(`Status: ${httpResult.status}`);
    console.log(`TTFB: ${formatTime(httpResult.time)}`);
    console.log("Headers:");
    httpResult.headers.forEach(h => console.log(`  ${h}`));

    activeSocket.end();

  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
  }
}

main();