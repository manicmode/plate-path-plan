export const flag = (k: string, def = false): boolean => {
  if (typeof window !== 'undefined') {
    const localFlag = localStorage.getItem(`flag:${k}`);
    if (localFlag !== null) {
      return localFlag === '1';
    }
  }
  
  const envVar = process.env[`NEXT_PUBLIC_${k}`];
  if (envVar !== undefined) {
    return envVar === '1';
  }
  
  return def;
};