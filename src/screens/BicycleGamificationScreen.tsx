import { Header, LoadingIndicator } from "@/components";
import {
  bicycleGamificationService,
  type BicycleRoute,
  type CheckInResult,
  type CurrentRental,
  type GameStatus,
} from "@/service/bicycle/bicycleGamificationService";
import { bookingService } from "@/service/booking/bookingService";
import type { Booking } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import polyline from "@mapbox/polyline";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Marker from "react-native-maps/lib/MapMarker";
import Polyline from "react-native-maps/lib/MapPolyline";
import MapView from "react-native-maps/lib/MapView";
import type { LatLng } from "react-native-maps/lib/sharedTypes";
import { SafeAreaView } from "react-native-safe-area-context";

const getRegionFromCoordinates = (coordinates: LatLng[]) => {
  if (coordinates.length === 0) {
    return {
      latitude: 16.047079,
      longitude: 108.20623,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const latitudeDelta = Math.max((maxLatitude - minLatitude) * 1.5, 0.01);
  const longitudeDelta = Math.max((maxLongitude - minLongitude) * 1.5, 0.01);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

const getRouteCoordinates = (routeItem: BicycleRoute): LatLng[] => {
  if (routeItem.polylineMap) {
    try {
      const decoded = polyline.decode(routeItem.polylineMap) as [
        number,
        number,
      ][];
      return decoded
        .map(([latitude, longitude]) => ({ latitude, longitude }))
        .filter(
          (point) =>
            Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
        );
    } catch {
      return [];
    }
  }

  return (routeItem.hiddenGems ?? [])
    .filter(
      (gem) => Number.isFinite(gem.latitude) && Number.isFinite(gem.longitude),
    )
    .map((gem) => ({ latitude: gem.latitude, longitude: gem.longitude }));
};

export default function BicycleGamificationScreen() {
  const route = useRoute<any>();
  const initialBookingId = route.params?.bookingId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gameLoading, setGameLoading] = useState(false);
  const [checkingInGemId, setCheckingInGemId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [gpsLoadingRouteId, setGpsLoadingRouteId] = useState<string | null>(
    null,
  );
  const [fullScreenRouteId, setFullScreenRouteId] = useState<string | null>(
    null,
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState(
    initialBookingId ?? "",
  );
  const [routes, setRoutes] = useState<BicycleRoute[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [rental, setRental] = useState<CurrentRental | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const selectedBooking =
    bookings.find((b) => b.id === selectedBookingId) ?? null;

  // Haversine distance (meters)
  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ─── 1. Load danh sách bookings khi screen focus ───────────────────────────
  const loadBookings = useCallback(async (): Promise<Booking[]> => {
    const list = await bookingService.getMyBookings();
    const valid = list.filter((b) => b.status === "CHECKED_IN");
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
      if (routeData.length > 0)
        setExpandedRouteId((prev) => prev ?? routeData[0].id);
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
            (valid.find((b) => b.id === selectedBookingId)
              ? selectedBookingId
              : "") ||
            valid[0]?.id ||
            "";

          if (targetId !== selectedBookingId) setSelectedBookingId(targetId);

          const target = valid.find((b) => b.id === targetId);
          if (target) await loadGameData(target);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
      // Chỉ chạy khi screen focus (không muốn re-run theo deps).
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
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

  // ─── 6. Check-in theo vị trí hiện tại gần polyline (<=50m) ──────────────
  const handleCheckInOnRoute = useCallback(
    async (routeItem: BicycleRoute) => {
      if (!selectedBookingId) {
        showToast("Vui lòng chọn chuyến đi trước", "warning");
        return;
      }
      if (!rental) {
        showToast("Bạn chưa được bàn giao xe cho booking này", "warning");
        return;
      }

      const routeCoordinates = getRouteCoordinates(routeItem);
      if (routeCoordinates.length === 0) {
        showToast("Lộ trình chưa có dữ liệu tọa độ", "warning");
        return;
      }

      setCheckingInGemId(`route-${routeItem.id}`);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          showToast(
            "Bạn cần cho phép ứng dụng truy cập vị trí để check-in",
            "warning",
          );
          return;
        }
        showToast("Đang xác định vị trí của bạn...", "info");
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Client-side distance check to nearest polyline point (50m)
        const nearestDistance = routeCoordinates.reduce(
          (minDistance, point) => {
            const distance = haversineDistance(
              location.coords.latitude,
              location.coords.longitude,
              point.latitude,
              point.longitude,
            );
            return Math.min(minDistance, distance);
          },
          Number.POSITIVE_INFINITY,
        );

        if (nearestDistance > 50) {
          showToast(
            `Bạn đang cách lộ trình ${Math.round(nearestDistance)}m — cần đến gần hơn (<=50m) để check-in.`,
            "warning",
          );
          return;
        }

        const result: CheckInResult = await bicycleGamificationService.checkIn({
          bookingId: selectedBookingId,
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
    },
    [selectedBookingId, bookings, loadGameData, rental, haversineDistance],
  );

  // ─── 7. Load GPS vị trí hiện tại ─────────────────────────────────────────
  const handleLoadGps = useCallback(async (routeId: string) => {
    if (Platform.OS === "web") {
      showToast("Tải GPS chỉ hỗ trợ trên app mobile", "warning");
      return;
    }

    setGpsLoadingRouteId(routeId);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast("Bạn cần cho phép truy cập vị trí", "warning");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      showToast("Đã cập nhật vị trí GPS", "success");
    } catch {
      showToast("Không thể lấy vị trí GPS. Vui lòng thử lại.", "error");
    } finally {
      setGpsLoadingRouteId(null);
    }
  }, []);

  // ─── 8. Toggle route details/map (dùng chung cho dropdown + nút map) ─────
  const handleToggleRoute = useCallback((routeId: string) => {
    setExpandedRouteId((prev) => (prev === routeId ? null : routeId));
  }, []);

  useEffect(() => {
    if (fullScreenRouteId && Platform.OS !== "web") {
      void handleLoadGps(fullScreenRouteId);
    }
  }, [fullScreenRouteId, handleLoadGps]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header title="Khám phá bằng xe đạp" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const totalCheckins = gameStatus?.history?.length ?? 0;
  const fullScreenRoute =
    routes.find((routeItem) => routeItem.id === fullScreenRouteId) ?? null;
  const fullScreenCoordinates = fullScreenRoute
    ? getRouteCoordinates(fullScreenRoute)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Header title="Khám phá bằng xe đạp" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0891b2"
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <MaterialCommunityIcons
            name="bike"
            size={28}
            color="#0891b2"
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.heroTitle}>
            Đạp xe khám phá, tích điểm đổi quà
          </Text>
          <Text style={styles.heroDesc}>
            Thuê xe đạp tại homestay, đi theo lộ trình trên bản đồ và check-in
            tại vị trí hiện tại khi đang ở gần lộ trình (trong vòng 50m).
          </Text>
        </View>

        {/* Chọn chuyến đi */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chuyến đi của bạn</Text>
          {bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="calendar-remove-outline"
                size={32}
                color="#94a3b8"
              />
              <Text style={styles.emptyText}>
                Bạn chưa có chuyến đi nào đang hoạt động.
              </Text>
              <Text style={styles.emptyHint}>
                Hãy đặt phòng và check-in để tham gia trò chơi.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsWrap}
            >
              {bookings.map((booking) => {
                const active = booking.id === selectedBookingId;
                const shortId = booking.id ? booking.id.slice(0, 8) : "";
                const checkIn = booking.checkIn
                  ? new Date(booking.checkIn).toLocaleDateString("vi-VN")
                  : "";
                const checkOut = booking.checkOut
                  ? new Date(booking.checkOut).toLocaleDateString("vi-VN")
                  : "";

                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={[
                      styles.bookingChip,
                      active && styles.bookingChipActive,
                    ]}
                    onPress={() => setSelectedBookingId(booking.id)}
                    activeOpacity={0.9}
                  >
                    <MaterialCommunityIcons
                      name="home-outline"
                      size={14}
                      color={active ? "#0e7490" : "#64748b"}
                    />
                    <View style={{ marginLeft: 6, maxWidth: 160 }}>
                      <Text
                        style={[
                          styles.bookingChipTitle,
                          active && styles.bookingChipTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {booking.homestayName || "Homestay"} • #{shortId}
                      </Text>
                      <Text
                        style={styles.bookingChipSubtitle}
                        numberOfLines={1}
                      >
                        {checkIn} → {checkOut}
                      </Text>
                    </View>
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
                    <MaterialCommunityIcons
                      name="star-circle-outline"
                      size={22}
                      color="#f59e0b"
                    />
                    <Text style={styles.statValue}>
                      {gameStatus?.totalPoints ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Điểm tích lũy</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialCommunityIcons
                      name="map-marker-check-outline"
                      size={22}
                      color="#16a34a"
                    />
                    <Text style={styles.statValue}>{totalCheckins}</Text>
                    <Text style={styles.statLabel}>Số lần check-in</Text>
                  </View>
                </View>

                {/* Xe đang thuê */}
                {rental ? (
                  <View style={styles.rentalCard}>
                    <View style={styles.rentalHeader}>
                      <MaterialCommunityIcons
                        name="bike-fast"
                        size={20}
                        color="#0e7490"
                      />
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
                    <MaterialCommunityIcons
                      name="bicycle"
                      size={20}
                      color="#94a3b8"
                    />
                    <Text style={styles.noRentalText}>
                      Bạn chưa thuê xe. Hãy liên hệ nhân viên homestay để thuê
                      xe đạp.
                    </Text>
                  </View>
                )}

                {/* Lộ trình & check-in theo polyline */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Lộ trình check-in</Text>
                  <Text style={styles.sectionHint}>
                    Bấm &quot;Check-in vị trí hiện tại&quot; khi bạn đang đứng
                    gần lộ trình (trong vòng 50m). Ứng dụng sẽ tự xác định vị
                    trí.
                  </Text>
                  {routes.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <MaterialCommunityIcons
                        name="map-search-outline"
                        size={32}
                        color="#94a3b8"
                      />
                      <Text style={styles.emptyText}>
                        Homestay này chưa có lộ trình xe đạp.
                      </Text>
                    </View>
                  ) : (
                    routes.map((routeItem) => {
                      const isExpanded = expandedRouteId === routeItem.id;
                      return (
                        <View key={routeItem.id} style={styles.routeCard}>
                          {/* Header route — bấm để expand/collapse */}
                          <TouchableOpacity
                            style={styles.routeHeader}
                            onPress={() => handleToggleRoute(routeItem.id)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons
                              name="map-marker-path"
                              size={16}
                              color="#0891b2"
                            />
                            <Text style={styles.routeName}>
                              {routeItem.routeName}
                            </Text>
                            <MaterialCommunityIcons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color="#64748b"
                            />
                          </TouchableOpacity>
                          <Text style={styles.routeMeta}>
                            {routeItem.totalDistanceKm ?? 0} km • khoảng{" "}
                            {routeItem.estimatedMinutes ?? 0} phút
                          </Text>
                          {routeItem.description ? (
                            <Text style={styles.routeDesc}>
                              {routeItem.description}
                            </Text>
                          ) : null}

                          {/* Nút xem bản đồ */}
                          <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => handleToggleRoute(routeItem.id)}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons
                              name="map-outline"
                              size={14}
                              color="#0891b2"
                            />
                            <Text style={styles.mapButtonText}>
                              {isExpanded ? "Ẩn bản đồ" : "Xem trên bản đồ"}
                            </Text>
                          </TouchableOpacity>

                          {/* Danh sách gems — chỉ hiện khi expanded */}
                          {isExpanded && (
                            <View style={styles.gemList}>
                              {(() => {
                                const routeCoordinates =
                                  getRouteCoordinates(routeItem);
                                if (routeCoordinates.length === 0) return null;

                                const startCoordinate = routeCoordinates[0];
                                const endCoordinate =
                                  routeCoordinates[routeCoordinates.length - 1];

                                return (
                                  <View style={styles.routeMapCard}>
                                    <Text style={styles.routeMapTitle}>
                                      Bản đồ lộ trình
                                    </Text>
                                    {Platform.OS === "web" ? (
                                      <View style={styles.routeMapWebFallback}>
                                        <Text style={styles.routeMapWebText}>
                                          Bản đồ nhúng chưa hỗ trợ tốt trên web.
                                        </Text>
                                        <Text style={styles.routeMapWebText}>
                                          Vui lòng mở app mobile để xem lộ trình
                                          và GPS hiện tại.
                                        </Text>
                                      </View>
                                    ) : (
                                      <>
                                        <MapView
                                          style={styles.routeMap}
                                          initialRegion={getRegionFromCoordinates(
                                            routeCoordinates,
                                          )}
                                          showsCompass
                                        >
                                          <Polyline
                                            coordinates={routeCoordinates}
                                            strokeColor="#0891b2"
                                            strokeWidth={4}
                                            lineCap="round"
                                            lineJoin="round"
                                          />

                                          {/* Start and End markers derived from polyline */}
                                          {startCoordinate && (
                                            <Marker
                                              coordinate={startCoordinate}
                                              title="Điểm bắt đầu"
                                            >
                                              <View
                                                style={styles.startMarker}
                                              />
                                            </Marker>
                                          )}
                                          {endCoordinate && (
                                            <Marker
                                              coordinate={endCoordinate}
                                              title="Điểm kết thúc"
                                            >
                                              <View style={styles.endMarker} />
                                            </Marker>
                                          )}

                                          {currentLocation && (
                                            <Marker
                                              coordinate={currentLocation}
                                              title="Vị trí hiện tại của bạn"
                                            >
                                              <View
                                                style={styles.currentMarker}
                                              />
                                            </Marker>
                                          )}
                                        </MapView>
                                        <View style={styles.mapActionRow}>
                                          <TouchableOpacity
                                            style={[
                                              styles.loadGpsButton,
                                              gpsLoadingRouteId ===
                                                routeItem.id &&
                                                styles.loadGpsButtonLoading,
                                            ]}
                                            onPress={() =>
                                              handleLoadGps(routeItem.id)
                                            }
                                            disabled={
                                              gpsLoadingRouteId !== null
                                            }
                                            activeOpacity={0.85}
                                          >
                                            <MaterialCommunityIcons
                                              name={
                                                gpsLoadingRouteId ===
                                                routeItem.id
                                                  ? "loading"
                                                  : "crosshairs-gps"
                                              }
                                              size={14}
                                              color="#fff"
                                            />
                                            <Text
                                              style={styles.loadGpsButtonText}
                                            >
                                              {gpsLoadingRouteId ===
                                              routeItem.id
                                                ? "Đang tải GPS..."
                                                : "Load GPS"}
                                            </Text>
                                          </TouchableOpacity>

                                          <TouchableOpacity
                                            style={styles.fullScreenButton}
                                            onPress={() =>
                                              setFullScreenRouteId(routeItem.id)
                                            }
                                            activeOpacity={0.85}
                                          >
                                            <MaterialCommunityIcons
                                              name="arrow-expand"
                                              size={14}
                                              color="#fff"
                                            />
                                            <Text
                                              style={
                                                styles.fullScreenButtonText
                                              }
                                            >
                                              Phóng to
                                            </Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={styles.checkInOnRouteButton}
                                            onPress={() =>
                                              handleCheckInOnRoute(routeItem)
                                            }
                                            disabled={
                                              checkingInGemId !== null ||
                                              !rental
                                            }
                                            activeOpacity={0.85}
                                          >
                                            <MaterialCommunityIcons
                                              name={
                                                checkingInGemId ===
                                                `route-${routeItem.id}`
                                                  ? "loading"
                                                  : "map-marker-check"
                                              }
                                              size={14}
                                              color="#fff"
                                            />
                                            <Text
                                              style={
                                                styles.checkInOnRouteButtonText
                                              }
                                            >
                                              {checkingInGemId ===
                                              `route-${routeItem.id}`
                                                ? "Đang check-in..."
                                                : "Check-in vị trí hiện tại"}
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                      </>
                                    )}
                                  </View>
                                );
                              })()}
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
                        <MaterialCommunityIcons
                          name="clock-check-outline"
                          size={14}
                          color="#64748b"
                        />
                        <Text style={styles.historyText}>
                          {new Date(h.checkInTime).toLocaleString("vi-VN")} — +
                          {h.pointsEarned} điểm
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

      <Modal
        visible={fullScreenRouteId !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setFullScreenRouteId(null)}
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle} numberOfLines={1}>
              {fullScreenRoute?.routeName ?? "Bản đồ lộ trình"}
            </Text>
            <TouchableOpacity
              style={styles.fullScreenCloseButton}
              onPress={() => setFullScreenRouteId(null)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {Platform.OS !== "web" && fullScreenRouteId && (
            <TouchableOpacity
              style={styles.fullScreenGpsBadge}
              onPress={() => handleLoadGps(fullScreenRouteId)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={
                  gpsLoadingRouteId === fullScreenRouteId
                    ? "loading"
                    : "crosshairs-gps"
                }
                size={14}
                color="#fff"
              />
              <Text style={styles.fullScreenGpsBadgeText}>
                {gpsLoadingRouteId === fullScreenRouteId
                  ? "Đang tải GPS..."
                  : "Load GPS"}
              </Text>
            </TouchableOpacity>
          )}

          {fullScreenCoordinates.length > 0 ? (
            <MapView
              style={styles.fullScreenMap}
              initialRegion={getRegionFromCoordinates(fullScreenCoordinates)}
              showsCompass
            >
              <Polyline
                coordinates={fullScreenCoordinates}
                strokeColor="#0891b2"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />

              {/* Fullscreen: derive start/end from polyline */}
              {fullScreenCoordinates[0] && (
                <Marker
                  coordinate={fullScreenCoordinates[0]}
                  title="Điểm bắt đầu"
                >
                  <View style={styles.startMarker} />
                </Marker>
              )}
              {fullScreenCoordinates[fullScreenCoordinates.length - 1] && (
                <Marker
                  coordinate={
                    fullScreenCoordinates[fullScreenCoordinates.length - 1]
                  }
                  title="Điểm kết thúc"
                >
                  <View style={styles.endMarker} />
                </Marker>
              )}

              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Vị trí hiện tại của bạn"
                >
                  <View style={styles.currentMarker} />
                </Marker>
              )}
            </MapView>
          ) : (
            <View style={styles.fullScreenEmpty}>
              <Text style={styles.fullScreenEmptyText}>
                Lộ trình này chưa có dữ liệu tọa độ để hiển thị.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  heroDesc: { fontSize: 13, lineHeight: 20, color: "#475569" },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 18,
  },

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
  bookingChipSubtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },

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
  rentalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
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
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  routeName: { fontSize: 14, fontWeight: "800", color: "#0f172a", flex: 1 },
  routeMeta: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  routeDesc: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 17,
  },
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
  routeMapCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginTop: 2,
  },
  routeMapTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  routeMap: {
    width: "100%",
    height: 220,
    borderRadius: 8,
  },
  routeMapWebFallback: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  routeMapWebText: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  startMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#16a34a",
    borderWidth: 2,
    borderColor: "#dcfce7",
  },
  stopMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#94a3b8",
  },
  gemMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#94a3b8",
  },
  checkedGemMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16a34a",
    borderWidth: 2,
    borderColor: "#dcfce7",
  },
  endMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#facc15",
    borderWidth: 2,
    borderColor: "#fde68a",
  },
  currentMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  mapActionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  loadGpsButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  loadGpsButtonLoading: { opacity: 0.65 },
  loadGpsButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  checkInOnRouteButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0e7490",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },
  checkInOnRouteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  fullScreenButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0f766e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fullScreenButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#0b1324",
  },
  fullScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111827",
  },
  fullScreenTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#e2e8f0",
    marginRight: 10,
  },
  fullScreenCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#334155",
  },
  fullScreenMap: {
    flex: 1,
  },
  fullScreenGpsBadge: {
    position: "absolute",
    top: 64,
    right: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fullScreenGpsBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  fullScreenEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  fullScreenEmptyText: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
  },
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
  gemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  gemDesc: { fontSize: 11, color: "#64748b", marginBottom: 4, lineHeight: 16 },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
  },
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
  calloutBox: {
    padding: 8,
    maxWidth: 180,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  calloutSubtitle: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  calloutButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  calloutButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
