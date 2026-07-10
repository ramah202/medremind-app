import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "./apiConfig";

export const HistoryAPI = {
  getMedicationHistory: async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      const response = await fetch(`${API_BASE_URL}/notification-logs/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message?.join(", ") || "Failed to fetch medication history"
        );
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching medication history:", error);
      throw error;
    }
  },
};