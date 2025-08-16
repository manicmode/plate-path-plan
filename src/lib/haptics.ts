import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();
const isMobileWeb = !isNative && /Android|iPhone|iPad/i.test(navigator.userAgent);
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let enabled = true; // runtime flag from context

export function setHapticsEnabled(v: boolean) { 
  enabled = v; 
}

function webVibrate(ms = 5) {
  if (!('vibrate' in navigator)) return;
  try { 
    navigator.vibrate(ms); 
  } catch {}
}

export async function lightTap() {
  if (!enabled || reduced) return;
  if (isNative) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  } else if (isMobileWeb) {
    webVibrate(5);
  }
}

export async function selectionStart() {
  if (!enabled || reduced) return;
  if (isNative) {
    try {
      await Haptics.selectionStart();
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }
}

export async function selectionChanged() {
  if (!enabled || reduced) return;
  if (isNative) {
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  } else if (isMobileWeb) {
    webVibrate(3);
  }
}

export async function selectionEnd() {
  if (!enabled || reduced) return;
  if (isNative) {
    try {
      await Haptics.selectionEnd();
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }
}