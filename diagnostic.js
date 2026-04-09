const dns = require('dns').promises;

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
        console.error("Invalid URL");
        process.exit(1);
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

const input = process.argv[2];
const parsed = parseInput(input);

(async () => {
    try {
        const result = await resolveDns(parsed.host);
        console.log(result);
    } catch (err) {
        console.error(err);
    }
})();