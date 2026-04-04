import { Button, Header, Input } from "@/components";
import { reviewService } from "@/service/review/reviewService";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function StarPicker({
  label,
  value,
  onChange,
  size = 28,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={styles.starPickerRow}>
      <Text style={styles.starPickerLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name={s <= value ? "star" : "star-outline"}
              size={size}
              color={s <= value ? "#fbbf24" : "#d1d5db"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function CreateReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookingId, homestayName } = route.params ?? {};

  const [overallRating, setOverallRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [locationRating, setLocationRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!comment.trim()) {
      showToast("Vui lòng nhập nhận xét", "warning");
      return;
    }
    try {
      setSubmitting(true);
      await reviewService.createReview({
        bookingId,
        overallRating,
        cleanlinessRating,
        locationRating,
        valueRating,
        communicationRating,
        comment: comment.trim(),
      });
      showToast("Gửi đánh giá thành công!", "success");
      navigation.goBack();
    } catch (e: any) {
      showToast(e?.message || "Không thể gửi đánh giá", "error");
    } finally {
      setSubmitting(false);
    }
  }, [bookingId, overallRating, cleanlinessRating, locationRating, valueRating, communicationRating, comment, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack title="Viết đánh giá" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Homestay name */}
          {homestayName ? (
            <View style={styles.homestayBox}>
              <MaterialCommunityIcons name="home-outline" size={18} color="#0891b2" />
              <Text style={styles.homestayName} numberOfLines={2}>{homestayName}</Text>
            </View>
          ) : null}

          {/* Overall rating — prominent */}
          <View style={styles.overallCard}>
            <Text style={styles.overallLabel}>Đánh giá tổng thể</Text>
            <View style={styles.overallStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setOverallRating(s)} activeOpacity={0.7}>
                  <MaterialCommunityIcons
                    name={s <= overallRating ? "star" : "star-outline"}
                    size={40}
                    color={s <= overallRating ? "#fbbf24" : "#d1d5db"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.overallText}>
              {["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"][overallRating]}
            </Text>
          </View>

          {/* Sub-ratings */}
          <View style={styles.subRatingsCard}>
            <Text style={styles.sectionTitle}>Chi tiết đánh giá</Text>
            <StarPicker label="Vệ sinh" value={cleanlinessRating} onChange={setCleanlinessRating} size={24} />
            <StarPicker label="Vị trí" value={locationRating} onChange={setLocationRating} size={24} />
            <StarPicker label="Giá trị" value={valueRating} onChange={setValueRating} size={24} />
            <StarPicker label="Giao tiếp" value={communicationRating} onChange={setCommunicationRating} size={24} />
          </View>

          {/* Comment */}
          <View style={styles.commentCard}>
            <Text style={styles.sectionTitle}>Nhận xét của bạn</Text>
            <Input
              placeholder="Chia sẻ trải nghiệm của bạn về homestay này..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
            />
          </View>

          <Button
            title={submitting ? "Đang gửi..." : "Gửi đánh giá"}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            size="large"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  homestayBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#e0f2fe", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#bae6fd",
  },
  homestayName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0369a1" },
  overallCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20,
    alignItems: "center", gap: 10,
  },
  overallLabel: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  overallStars: { flexDirection: "row", gap: 6 },
  overallText: { fontSize: 15, fontWeight: "600", color: "#f59e0b" },
  subRatingsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  starPickerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  starPickerLabel: { fontSize: 14, color: "#475569", fontWeight: "500" },
  stars: { flexDirection: "row", gap: 4 },
  commentCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  submitBtn: { marginTop: 4 },
});
