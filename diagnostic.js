const dns = require('dns').promises;
const net = require('net');

function parseInput(input) {
    try {
        if (!input.startsWith('http')) {
            input = 'http://' + input;
        }

        const url = new URL(input);

        return {
            scheme: url.protocol.replace(':', ''),
            host: url.hostname,
            port: url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname || '/'
        };
    } catch (err) {
        throw new Error("Invalid URL");
    }
}

async function resolveDns(host) {
    const start = process.hrtime.bigint();

    const [ipv4, ipv6] = await Promise.allSettled([
        dns.resolve4(host),
        dns.resolve6(host)
    ]);

    const end = process.hrtime.bigint();

    return {
        ipv4: ipv4.status === "fulfilled" ? ipv4.value : [],
        ipv6: ipv6.status === "fulfilled" ? ipv6.value : [],
        time: Number(end - start) / 1e6
    };
}

function tcpConnect(ip, port, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = process.hrtime.bigint();

        const socket = net.createConnection({ host: ip, port });

        const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error('TCP timeout'));
        }, timeout);

        socket.on('connect', () => {
            clearTimeout(timer);
            const end = process.hrtime.bigint();

            resolve({
                ip,
                time: Number(end - start) / 1e6
            });

            socket.end();
        });

        socket.on('error', (err) => {
            clearTimeout(timer);
            reject(new Error(`TCP error (${ip}): ${err.message}`));
        });
    });
}

const input = process.argv[2];

(async () => {
    try {
        if (!input) throw new Error("No input provided");

        const parsed = parseInput(input);

        const dnsResult = await resolveDns(parsed.host);
        console.log("DNS:", dnsResult);

        const ips = [...dnsResult.ipv4, ...dnsResult.ipv6];

        if (ips.length === 0) {
            throw new Error("No IPs resolved");
        }

        // Try connections sequentially (safer than blasting all)
        for (const ip of ips) {
            try {
                const result = await tcpConnect(ip, parsed.port);
                console.log("TCP Success:", result);
                return;
            } catch (err) {
                console.log(err.message);
            }
        }

        throw new Error("All TCP attempts failed");

    } catch (err) {
        console.error("Error:", err.message);
    }
})();