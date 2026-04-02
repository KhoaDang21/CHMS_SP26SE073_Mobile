import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Homestay } from "@/types";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import { bookingService } from "@/service/booking/bookingService";
import {
  Button,
  Input,
  Header,
  Divider,
  LoadingIndicator,
  AlertDialog,
} from "@/components";
import { showToast } from "@/utils/toast";
import { logger } from "@/utils/logger";

export default function HomestayDetailScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string;
  const [item, setItem] = useState<Homestay | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Booking form state
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [guestCount, setGuestCount] = useState(1);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const data = await publicHomestayService.getById(id);
        setItem(data);
      } catch (error) {
        showToast("Không thể tải chi tiết căn nhà", "error");
        logger.error("Failed to load homestay details", error);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  const handleCheckInDate = (event: any, date?: Date) => {
    setShowCheckInPicker(false);
    if (date) setCheckInDate(date);
  };

  const handleCheckOutDate = (event: any, date?: Date) => {
    setShowCheckOutPicker(false);
    if (date) {
      if (date <= checkInDate) {
        showToast("Ngày trả phòng phải sau ngày nhận phòng", "warning");
        return;
      }
      setCheckOutDate(date);
    }
  };

  const handleBooking = useCallback(async () => {
    if (!item || !phone) {
      showToast("Vui lòng nhập tất cả thông tin", "warning");
      return;
    }

    try {
      setBooking(true);
      const res = await bookingService.createBooking({
        homestayId: item.id,
        checkIn: checkInDate.toISOString().split("T")[0],
        checkOut: checkOutDate.toISOString().split("T")[0],
        guestsCount: guestCount,
        contactPhone: phone,
      });

      if (res.success) {
        setSuccessMessage(res.message || "Đặt phòng thành công!");
        setSuccessDialogVisible(true);
      } else {
        showToast(res.message || "Không thể đặt phòng", "error");
      }
    } catch (error: any) {
      showToast(error?.message || "Đặt phòng thất bại", "error");
    } finally {
      setBooking(false);
    }
  }, [item, checkInDate, checkOutDate, guestCount, phone]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header showBack={true} />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <Header showBack={true} />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color="#ef4444"
          />
          <Text style={styles.errorText}>Không tìm thấy căn nhà</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <FlatList
          data={item.images || []}
          keyExtractor={(_, idx) => idx.toString()}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: image }) => (
            <Image
              source={{ uri: image }}
              style={styles.carouselImage}
            />
          )}
          sliderHeight={250}
          itemWidth={undefined}
          style={{ height: 250 }}
        />

        {/* Basic Info */}
        <View style={styles.infoSection}>
          <View>
            <Text style={styles.homestayTitle}>{item.name}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#0891b2"
              />
              <Text style={styles.location} numberOfLines={1}>
                {item.districtName}, {item.provinceName}
              </Text>
            </View>
          </View>

          {item.averageRating && (
            <View style={styles.ratingCard}>
              <MaterialCommunityIcons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingValue}>
                {item.averageRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <Divider />

        {/* Price */}
        <View style={styles.priceSection}>
          <View>
            <Text style={styles.priceLabel}>Giá Mỗi Đêm</Text>
            <Text style={styles.priceValue}>
              ₫{item.pricePerNight.toLocaleString("vi-VN")}
            </Text>
          </View>
        </View>

        <Divider />

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Tiện Ích</Text>
          <View style={styles.featuresGrid}>
            {item.bedrooms && (
              <View style={styles.featureItem}>
                <MaterialCommunityIcons
                  name="bed"
                  size={24}
                  color="#0891b2"
                />
                <Text style={styles.featureLabel}>{item.bedrooms} Phòng</Text>
              </View>
            )}
            {item.bathrooms && (
              <View style={styles.featureItem}>
                <MaterialCommunityIcons
                  name="shower"
                  size={24}
                  color="#0891b2"
                />
                <Text style={styles.featureLabel}>{item.bathrooms} Phòng Tắm</Text>
              </View>
            )}
            {item.maxGuests && (
              <View style={styles.featureItem}>
                <MaterialCommunityIcons
                  name="account-multiple"
                  size={24}
                  color="#0891b2"
                />
                <Text style={styles.featureLabel}>Tối Đa {item.maxGuests}</Text>
              </View>
            )}
            {item.amenities && item.amenities.length > 0 && (
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-all" size={24} color="#0891b2" />
                <Text style={styles.featureLabel}>{item.amenities.length} Tiện Ích</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <>
            <Divider />
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Giới Thiệu</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </>
        )}

        {/* Amenities List */}
        {item.amenities && item.amenities.length > 0 && (
          <>
            <Divider />
            <View style={styles.amenitiesSection}>
              <Text style={styles.sectionTitle}>Các Tiện Ích</Text>
              <View style={styles.amenitiesList}>
                {item.amenities.map((amenity: any, idx: number) => (
                  <View key={idx} style={styles.amenityItem}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color="#10b981"
                    />
                    <Text style={styles.amenityText}>
                      {amenity.name || amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Booking Section */}
        <Divider />
        <View style={styles.bookingSection}>
          <Text style={styles.sectionTitle}>Đặt Phòng</Text>

          {/* Date Pickers */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowCheckInPicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color="#0891b2"
            />
            <View style={styles.dateButtonContent}>
              <Text style={styles.dateLabel}>Ngày Nhận Phòng</Text>
              <Text style={styles.dateValue}>
                {checkInDate.toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowCheckOutPicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color="#0891b2"
            />
            <View style={styles.dateButtonContent}>
              <Text style={styles.dateLabel}>Ngày Trả Phòng</Text>
              <Text style={styles.dateValue}>
                {checkOutDate.toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Guest Counter */}
          <View style={styles.counterContainer}>
            <Text style={styles.counterLabel}>Số Lượng Khách</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
              >
                <MaterialCommunityIcons name="minus" size={18} color="#0891b2" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{guestCount}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setGuestCount(Math.min(item.maxGuests || 10, guestCount + 1))}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#0891b2" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone Input */}
          <Input
            label="Số Điện Thoại"
            placeholder="Nhập số điện thoại liên hệ"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon="phone-outline"
          />

          {/* Book Button */}
          <Button
            title="Đặt Phòng"
            onPress={handleBooking}
            loading={booking}
            disabled={booking}
            size="large"
            style={styles.bookButton}
          />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Date Pickers */}
      {showCheckInPicker && (
        <DateTimePicker
          value={checkInDate}
          mode="date"
          display="spinner"
          onChange={handleCheckInDate}
          minimumDate={new Date()}
        />
      )}

      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOutDate}
          mode="date"
          display="spinner"
          onChange={handleCheckOutDate}
          minimumDate={
            new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)
          }
        />
      )}

      {/* Success Dialog */}
      <AlertDialog
        visible={successDialogVisible}
        title="Thành Công"
        message={successMessage}
        confirmText="OK"
        onConfirm={() => setSuccessDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "600",
  },
  carouselImage: {
    width: "100%",
    height: 250,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  homestayTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  location: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  ratingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
  },
  priceSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  priceLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0891b2",
  },
  featuresSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  featureLabel: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "center",
  },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  amenitiesSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  amenitiesList: {
    gap: 10,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amenityText: {
    fontSize: 13,
    color: "#1e293b",
  },
  bookingSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#e0f2fe",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dateButtonContent: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#0891b2",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0891b2",
  },
  counterContainer: {
    marginBottom: 16,
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingVertical: 8,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    minWidth: 30,
    textAlign: "center",
  },
  bookButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});
