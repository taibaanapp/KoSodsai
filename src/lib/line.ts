import liff from '@line/liff';

export const initLiff = async () => {
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId) {
    console.warn('VITE_LIFF_ID is not set. LIFF features will be disabled.');
    return null;
  }

  try {
    await liff.init({ liffId });
    if (!liff.isLoggedIn()) {
      liff.login();
    }
    return liff;
  } catch (error) {
    console.error('LIFF initialization failed', error);
    return null;
  }
};

export const getProfile = async () => {
  if (!liff.isLoggedIn()) return null;
  return await liff.getProfile();
};

export const logout = () => {
  if (liff.isLoggedIn()) {
    liff.logout();
    window.location.reload();
  }
};
