import { useCallback } from 'react';
import { logStatsigEvent, flushStatsig } from '../utils/statsigClient';

export function useStatsig() {
	const logEvent = useCallback((eventName: string, value?: string, metadata?: Record<string, any>) => {
		logStatsigEvent(eventName, value, metadata);
	}, []);

	const flush = useCallback(async () => {
		await flushStatsig();
	}, []);

	return { logEvent, flush };
}



