function parseInput(input) {
    try {
        const url = new URL(input);

        return {
            scheme: url.protocol.replace(':', ''),
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname || '/'
        };
    } catch (err) {
        console.error("Invalid URL");
        process.exit(1);
    }
}
const input = process.argv[2];
console.log(parseInput(input));