import { StatsigClient } from '@statsig/js-client';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';

let statsigClient: StatsigClient | null = null;

function getClientKey(): string | undefined {
	// Prefer env; fall back to hardcoded only if provided (avoid hallucinating keys)
	const key = import.meta.env.VITE_STATSIG_CLIENT_KEY as string | undefined;
	return key;
}

export function getStatsigClient(): StatsigClient | null {
	if (typeof window === 'undefined') return null;
	if (statsigClient) return statsigClient;

	const clientKey = getClientKey();
	if (!clientKey) {
		console.warn('Statsig not initialized: missing VITE_STATSIG_CLIENT_KEY');
		return null;
	}

	statsigClient = new StatsigClient(
		clientKey,
		{ userID: 'anonymous' },
		{
			plugins: [
				new StatsigSessionReplayPlugin(),
				new StatsigAutoCapturePlugin(),
			],
		}
	);

	return statsigClient;
}

export async function initializeStatsig(user: { userID?: string; email?: string; [key: string]: any } = { userID: 'anonymous' }): Promise<void> {
	const client = getStatsigClient();
	if (!client) return;

    // Note: User is passed in constructor; if you need to update later, call client.updateUser

	try {
		await client.initializeAsync();
	} catch (err) {
		console.warn('Statsig initialization failed:', err);
	}
}

export function logStatsigEvent(eventName: string, value?: string, metadata?: Record<string, any>): void {
	const client = getStatsigClient();
	if (!client) return;
	client.logEvent(eventName, value, metadata);
}

export async function flushStatsig(): Promise<void> {
	const client = getStatsigClient();
	if (!client) return;
	try {
		await client.flush();
	} catch (err) {
		console.warn('Statsig flush failed:', err);
	}
}

export async function updateStatsigUser(user: { userID?: string; email?: string; [key: string]: any }): Promise<void> {
	const client = getStatsigClient();
	if (!client) return;
	try {
		await client.updateUser(user);
	} catch (err) {
		console.warn('Statsig updateUser failed:', err);
	}
}


