import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/types";

const TOKEN_KEY = "authToken";
const REFRESH_KEY = "refreshToken";
const USER_KEY = "userData";

export const tokenStorage = {
  async getToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      return null;
    }
  },
  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(REFRESH_KEY);
    } catch (error) {
      return null;
    }
  },
  async getUser(): Promise<User | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch (error) {
      return null;
    }
  },
  async setSession(token: string, refreshToken: string | null, user: User) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      throw error;
    }
  },
  async clear() {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
    } catch (error) {
      throw error;
    }
  },
};
