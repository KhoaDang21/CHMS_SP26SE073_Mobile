import { Header, LoadingIndicator } from "@/components";
import { bookingService } from "@/service/booking/bookingService";
import {
  bicycleGamificationService,
  type BicycleRoute,
  type CurrentRental,
  type GameStatus,
  type CheckInResult,
} from "@/service/bicycle/bicycleGamificationService";
import type { Booking } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BicycleGamificationScreen() {
  const route = useRoute<any>();
  const initialBookingId = route.params?.bookingId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gameLoading, setGameLoading] = useState(false);
  const [checkingInGemId, setCheckingInGemId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookingId ?? "");
  const [routes, setRoutes] = useState<BicycleRoute[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [rental, setRental] = useState<CurrentRental | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) ?? null;

  // ─── 1. Load danh sách bookings khi screen focus ───────────────────────────
  const loadBookings = useCallback(async (): Promise<Booking[]> => {
    const list = await bookingService.getMyBookings();
    const valid = list.filter((b) =>
      ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(b.status),
    );
    setBookings(valid);
    return valid;
  }, []);

  // ─── 2. Load game data theo booking đang chọn ─────────────────────────────
  const loadGameData = useCallback(async (booking: Booking) => {
    if (!booking.homestayId) {
      setRoutes([]);
      setGameStatus(null);
      setRental(null);
      return;
    }
    setGameLoading(true);
    try {
      const [routeData, statusData, rentalData] = await Promise.all([
        bicycleGamificationService.getRoutes(booking.homestayId),
        bicycleGamificationService.getStatus(booking.id),
        bicycleGamificationService.getMyRental(booking.id),
      ]);
      setRoutes(routeData);
      setGameStatus(statusData);
      setRental(rentalData);
      // Auto-expand route đầu tiên
      if (routeData.length > 0) setExpandedRouteId((prev) => prev ?? routeData[0].id);
    } catch {
      showToast("Không thể tải dữ liệu xe đạp", "error");
    } finally {
      setGameLoading(false);
    }
  }, []);

  // ─── 3. Focus effect: load bookings → tự chọn booking đầu tiên ───────────
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const valid = await loadBookings();
          if (!active) return;

          // Ưu tiên: param từ navigation > đang chọn > đầu tiên trong list
          const targetId =
            initialBookingId ||
            (valid.find((b) => b.id === selectedBookingId) ? selectedBookingId : "") ||
            valid[0]?.id ||
            "";

          if (targetId !== selectedBookingId) setSelectedBookingId(targetId);

          const target = valid.find((b) => b.id === targetId);
          if (target) await loadGameData(target);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, []), // eslint-disable-line react-hooks/exhaustive-deps — chỉ chạy khi focus
  );

  // ─── 4. Khi user chọn booking khác → reload game data ────────────────────
  const prevBookingIdRef = useRef(selectedBookingId);
  useEffect(() => {
    if (prevBookingIdRef.current === selectedBookingId) return;
    prevBookingIdRef.current = selectedBookingId;
    const booking = bookings.find((b) => b.id === selectedBookingId);
    if (booking) loadGameData(booking);
  }, [selectedBookingId, bookings, loadGameData]);

  // ─── 5. Pull-to-refresh ───────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const valid = await loadBookings();
      const booking = valid.find((b) => b.id === selectedBookingId) ?? valid[0];
      if (booking) {
        if (booking.id !== selectedBookingId) setSelectedBookingId(booking.id);
        await loadGameData(booking);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedBookingId, loadBookings, loadGameData]);

  // ─── 6. Check-in ──────────────────────────────────────────────────────────
  const handleCheckIn = useCallback(async (gemId: string) => {
    if (!selectedBookingId) {
      showToast("Vui lòng chọn chuyến đi trước", "warning");
      return;
    }
    if (!rental) {
      showToast("Bạn chưa được bàn giao xe cho booking này", "warning");
      return;
    }
    setCheckingInGemId(gemId);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast("Bạn cần cho phép ứng dụng truy cập vị trí để check-in", "warning");
        return;
      }
      showToast("Đang xác định vị trí của bạn...", "info");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result: CheckInResult = await bicycleGamificationService.checkIn({
        bookingId: selectedBookingId,
        hiddenGemId: gemId,
        currentLatitude: location.coords.latitude,
        currentLongitude: location.coords.longitude,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      const successMsg =
        result.distance != null
          ? `${result.message} (cách ${Math.round(result.distance)}m)`
          : result.message;
      showToast(successMsg, "success");

      // Reload game data sau check-in thành công
      const booking = bookings.find((b) => b.id === selectedBookingId);
      if (booking) await loadGameData(booking);
    } catch {
      showToast("Có lỗi xảy ra khi check-in. Vui lòng thử lại.", "error");
    } finally {
      setCheckingInGemId(null);
    }
  }, [selectedBookingId, bookings, loadGameData, rental]);

  // ─── 7. Mở Google Maps cho lộ trình ─────────────────────────────────────
  const handleOpenMap = useCallback((routeItem: BicycleRoute) => {
    const firstGem = routeItem.hiddenGems?.[0];
    if (firstGem) {
      const url = `https://www.google.com/maps/search/?api=1&query=${firstGem.latitude},${firstGem.longitude}`;
      Linking.openURL(url).catch(() => showToast("Không thể mở bản đồ", "error"));
    } else {
      showToast("Lộ trình này chưa có tọa độ địa điểm", "warning");
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header title="Khám phá bằng xe đạp" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const checkedGemIds = new Set(gameStatus?.checkedInGemIds ?? []);
  const totalGems = routes.reduce((sum, r) => sum + (r.hiddenGems?.length ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Header title="Khám phá bằng xe đạp" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
        }
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <MaterialCommunityIcons name="bike" size={28} color="#0891b2" style={{ marginBottom: 8 }} />
          <Text style={styles.heroTitle}>Đạp xe khám phá, tích điểm đổi quà</Text>
          <Text style={styles.heroDesc}>
            Thuê xe đạp tại homestay, đạp đến các địa điểm ẩn trong lộ trình và check-in để nhận điểm thưởng. Bạn cần đến đúng nơi (trong vòng 50m) mới check-in được nhé!
          </Text>
        </View>

        {/* Chọn chuyến đi */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chuyến đi của bạn</Text>
          {bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={32} color="#94a3b8" />
              <Text style={styles.emptyText}>Bạn chưa có chuyến đi nào đang hoạt động.</Text>
              <Text style={styles.emptyHint}>Hãy đặt phòng và check-in để tham gia trò chơi.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsWrap}
            >
              {bookings.map((booking) => {
                const active = booking.id === selectedBookingId;
                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={[styles.bookingChip, active && styles.bookingChipActive]}
                    onPress={() => setSelectedBookingId(booking.id)}
                    activeOpacity={0.9}
                  >
                    <MaterialCommunityIcons
                      name="home-outline"
                      size={14}
                      color={active ? "#0e7490" : "#64748b"}
                    />
                    <Text
                      style={[styles.bookingChipTitle, active && styles.bookingChipTitleActive]}
                      numberOfLines={1}
                    >
                      {booking.homestayName || "Homestay"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Game content — chỉ render khi đã chọn booking */}
        {selectedBooking && (
          <>
            {gameLoading ? (
              <View style={styles.gameLoadingBox}>
                <LoadingIndicator />
              </View>
            ) : (
              <>
                {/* Stats */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <MaterialCommunityIcons name="star-circle-outline" size={22} color="#f59e0b" />
                    <Text style={styles.statValue}>{gameStatus?.totalPoints ?? 0}</Text>
                    <Text style={styles.statLabel}>Điểm tích lũy</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialCommunityIcons name="map-marker-check-outline" size={22} color="#16a34a" />
                    <Text style={styles.statValue}>
                      {checkedGemIds.size} / {totalGems}
                    </Text>
                    <Text style={styles.statLabel}>Địa điểm đã khám phá</Text>
                  </View>
                </View>

                {/* Xe đang thuê */}
                {rental ? (
                  <View style={styles.rentalCard}>
                    <View style={styles.rentalHeader}>
                      <MaterialCommunityIcons name="bike-fast" size={20} color="#0e7490" />
                      <Text style={styles.rentalTitle}>XE ĐANG THUÊ</Text>
                    </View>
                    <Text style={styles.rentalText}>
                      {rental.bicycleCode} — {rental.bicycleType}
                    </Text>
                    <Text style={styles.rentalSub}>
                      {rental.pricePerDay > 0
                        ? `${new Intl.NumberFormat("vi-VN").format(rental.pricePerDay)} VND/ngày`
                        : "Liên hệ nhân viên để biết giá"}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noRentalCard}>
                    <MaterialCommunityIcons name="bicycle" size={20} color="#94a3b8" />
                    <Text style={styles.noRentalText}>
                      Bạn chưa thuê xe. Hãy liên hệ nhân viên homestay để thuê xe đạp.
                    </Text>
                  </View>
                )}

                {/* Lộ trình & địa điểm ẩn */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Lộ trình & địa điểm ẩn</Text>
                  <Text style={styles.sectionHint}>
                    Bấm "Check-in tại đây" khi bạn đang đứng gần địa điểm đó (trong vòng 50m). Ứng dụng sẽ tự xác định vị trí của bạn.
                  </Text>
                  {routes.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <MaterialCommunityIcons name="map-search-outline" size={32} color="#94a3b8" />
                      <Text style={styles.emptyText}>Homestay này chưa có lộ trình xe đạp.</Text>
                    </View>
                  ) : (
                    routes.map((routeItem) => {
                      const isExpanded = expandedRouteId === routeItem.id;
                      return (
                        <View key={routeItem.id} style={styles.routeCard}>
                          {/* Header route — bấm để expand/collapse */}
                          <TouchableOpacity
                            style={styles.routeHeader}
                            onPress={() => setExpandedRouteId(isExpanded ? null : routeItem.id)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="map-marker-path" size={16} color="#0891b2" />
                            <Text style={styles.routeName}>{routeItem.routeName}</Text>
                            <MaterialCommunityIcons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color="#64748b"
                            />
                          </TouchableOpacity>
                          <Text style={styles.routeMeta}>
                            {routeItem.totalDistanceKm ?? 0} km • khoảng {routeItem.estimatedMinutes ?? 0} phút
                          </Text>
                          {routeItem.description ? (
                            <Text style={styles.routeDesc}>{routeItem.description}</Text>
                          ) : null}

                          {/* Nút xem bản đồ */}
                          <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => handleOpenMap(routeItem)}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons name="map-outline" size={14} color="#0891b2" />
                            <Text style={styles.mapButtonText}>Xem trên bản đồ</Text>
                          </TouchableOpacity>

                          {/* Danh sách gems — chỉ hiện khi expanded */}
                          {isExpanded && (
                            <View style={styles.gemList}>
                              {(routeItem.hiddenGems || []).length === 0 ? (
                                <View style={styles.noGemBox}>
                                  <MaterialCommunityIcons name="map-marker-question-outline" size={20} color="#94a3b8" />
                                  <Text style={styles.noGemText}>
                                    Lộ trình này chưa có địa điểm ẩn. Hãy hỏi nhân viên homestay để biết thêm!
                                  </Text>
                                </View>
                              ) : (
                                (routeItem.hiddenGems || []).map((gem) => {
                                  const checked = checkedGemIds.has(gem.id);
                                  const isCheckingThis = checkingInGemId === gem.id;
                                  return (
                                    <View
                                      key={gem.id}
                                      style={[styles.gemItem, checked && styles.gemItemChecked]}
                                    >
                                      <View style={styles.gemLeft}>
                                        <MaterialCommunityIcons
                                          name={checked ? "map-marker-check" : "map-marker-outline"}
                                          size={20}
                                          color={checked ? "#16a34a" : "#0891b2"}
                                        />
                                        <View style={{ flex: 1 }}>
                                          <Text style={styles.gemName}>{gem.name}</Text>
                                          {gem.description ? (
                                            <Text style={styles.gemDesc}>{gem.description}</Text>
                                          ) : null}
                                          <View style={styles.pointsBadge}>
                                            <MaterialCommunityIcons name="star" size={11} color="#f59e0b" />
                                            <Text style={styles.pointsText}>+{gem.rewardPoints} điểm</Text>
                                          </View>
                                        </View>
                                      </View>
                                      {checked ? (
                                        <View style={styles.checkedBadge}>
                                          <Text style={styles.checkedBadgeText}>Đã khám phá</Text>
                                        </View>
                                      ) : (
                                        <TouchableOpacity
                                          style={[
                                            styles.checkInButton,
                                            isCheckingThis && styles.checkInButtonLoading,
                                          ]}
                                          onPress={() => handleCheckIn(gem.id)}
                                          disabled={checkingInGemId !== null || !rental}
                                          activeOpacity={0.85}
                                        >
                                          <MaterialCommunityIcons
                                            name={isCheckingThis ? "loading" : "crosshairs-gps"}
                                            size={14}
                                            color="#fff"
                                          />
                                          <Text style={styles.checkInButtonText}>
                                            {isCheckingThis ? "Đang xử lý..." : rental ? "Check-in tại đây" : "Chưa có xe"}
                                          </Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  );
                                })
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Lịch sử check-in */}
                {(gameStatus?.history?.length ?? 0) > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Lịch sử khám phá</Text>
                    {gameStatus!.history.map((h, i) => (
                      <View key={i} style={styles.historyItem}>
                        <MaterialCommunityIcons name="clock-check-outline" size={14} color="#64748b" />
                        <Text style={styles.historyText}>
                          {new Date(h.checkInTime).toLocaleString("vi-VN")} — +{h.pointsEarned} điểm
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f9ff" },
  content: { padding: 16, gap: 14, paddingBottom: 32 },

  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "flex-start",
  },
  heroTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  heroDesc: { fontSize: 13, lineHeight: 20, color: "#475569" },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  sectionHint: { fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 18 },

  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptyText: { fontSize: 13, color: "#64748b", textAlign: "center" },
  emptyHint: { fontSize: 12, color: "#94a3b8", textAlign: "center" },

  gameLoadingBox: { paddingVertical: 40 },

  chipsWrap: { gap: 10, paddingVertical: 4 },
  bookingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bookingChipActive: { backgroundColor: "#e0f2fe", borderColor: "#0891b2" },
  bookingChipTitle: { fontSize: 13, fontWeight: "700", color: "#334155" },
  bookingChipTitleActive: { color: "#0e7490" },

  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statLabel: { fontSize: 11, color: "#64748b", textAlign: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },

  rentalCard: {
    backgroundColor: "#ecfeff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#a5f3fc",
    gap: 4,
  },
  rentalHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  rentalTitle: { fontSize: 12, color: "#0e7490", fontWeight: "700" },
  rentalText: { fontSize: 15, color: "#0f172a", fontWeight: "800" },
  rentalSub: { fontSize: 12, color: "#0e7490", fontWeight: "600" },

  noRentalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noRentalText: { flex: 1, fontSize: 13, color: "#64748b", lineHeight: 18 },

  routeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
    marginBottom: 10,
  },
  routeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  routeName: { fontSize: 14, fontWeight: "800", color: "#0f172a", flex: 1 },
  routeMeta: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  routeDesc: { fontSize: 12, color: "#475569", marginBottom: 8, lineHeight: 17 },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapButtonText: { fontSize: 12, color: "#0891b2", fontWeight: "600" },
  noGemBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  noGemText: { flex: 1, fontSize: 12, color: "#94a3b8", lineHeight: 17 },
  gemList: { gap: 8, marginTop: 6 },

  gemItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#fff",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  gemItemChecked: { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
  gemLeft: { flexDirection: "row", alignItems: "flex-start", gap: 8, flex: 1 },
  gemName: { fontSize: 13, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  gemDesc: { fontSize: 11, color: "#64748b", marginBottom: 4, lineHeight: 16 },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start" },
  pointsText: { fontSize: 11, color: "#d97706", fontWeight: "700" },

  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0891b2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  checkInButtonLoading: { opacity: 0.65 },
  checkInButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  checkedBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  checkedBadgeText: { fontSize: 11, color: "#16a34a", fontWeight: "700" },

  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  historyText: { fontSize: 12, color: "#475569" },
});
