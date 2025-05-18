export const fetchHandler = {
	async fetch(_request: Request): Promise<Response> {
		return new Response('Hello from Destiny backend!', {
			headers: { 'content-type': 'text/plain' },
		});
	},
};
