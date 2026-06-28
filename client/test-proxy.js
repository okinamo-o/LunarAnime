import * as proxy from './api/proxy.js';

async function test() {
    const req = { query: { action: 'latest-episodes' } };
    const res = {
        status: (code) => ({
            json: (data) => console.log(`Status ${code}:`, data)
        }),
        setHeader: () => {}
    };
    await proxy.default(req, res);
}
test();
