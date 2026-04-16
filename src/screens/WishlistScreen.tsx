import { EmptyState, Header, LoadingIndicator } from "@/components";
import { wishlistService, type CompareResult, type HomestayScore } from "@/service/wishlist/wishlistService";
import type { Homestay } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const MAX_COMPARE = 4;

function sortByRating(list: Homestay[]): Homestay[] {
  return [...list].sort((a, b) => {
    const avgA = a.averageRating ?? 0;
    const avgB = b.averageRating ?? 0;
    if (avgB !== avgA) return avgB - avgA;
    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
}

// ── Score Bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 10, color = "#0891b2" }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={sb.row}>
      <Text style={sb.label}>{label}</Text>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[sb.val, { color }]}>{value}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { width: 70, fontSize: 12, color: "#64748b", fontWeight: "600" },
  track: { flex: 1, height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginHorizontal: 8 },
  fill: { height: "100%", borderRadius: 3 },
  val: { width: 24, fontSize: 12, fontWeight: "800", textAlign: "right" },
});

// ── Compare Result Modal ──────────────────────────────────────────────────────
function CompareResultModal({ result, onClose }: { result: CompareResult; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const scoreColors = ["#0891b2", "#f59e0b", "#10b981", "#8b5cf6"];

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
        {/* Header */}
        <View style={cr.header}>
          <View style={cr.headerLeft}>
            <MaterialCommunityIcons name="compare" size={20} color="#fff" />
            <Text style={cr.headerTitle}>Kết quả so sánh</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={cr.closeBtn}>
            <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Score cards */}
          {result.scores.length > 0 && (
            <View style={cr.section}>
              <Text style={cr.sectionTitle}>📊 Điểm số đánh giá</Text>
              {result.scores.map((s, i) => (
                <View key={s.homestayId} style={cr.scoreCard}>
                  <View style={cr.scoreHeader}>
                    <View style={[cr.scoreDot, { backgroundColor: scoreColors[i % scoreColors.length] }]} />
                    <Text style={cr.scoreName} numberOfLines={1}>{s.homestayName}</Text>
                    <View style={[cr.matchBadge, { backgroundColor: scoreColors[i % scoreColors.length] + "20" }]}>
                      <Text style={[cr.matchText, { color: scoreColors[i % scoreColors.length] }]}>{s.matchScore}%</Text>
                    </View>
                  </View>
                  <ScoreBar label="Giá cả" value={s.priceScore} color={scoreColors[i % scoreColors.length]} />
                  <ScoreBar label="Tiện ích" value={s.amenityScore} color={scoreColors[i % scoreColors.length]} />
                  <ScoreBar label="Vị trí" value={s.locationScore} color={scoreColors[i % scoreColors.length]} />
                </View>
              ))}
            </View>
          )}

          {/* AI Analysis */}
          {result.aiAnalysisMarkdown ? (
            <View style={cr.section}>
              <Text style={cr.sectionTitle}>🤖 Phân tích AI</Text>
              <View style={cr.analysisBox}>
                <Text style={cr.analysisText}>{result.aiAnalysisMarkdown.replace(/\*\*/g, "").replace(/#{1,3}\s/g, "")}</Text>
              </View>
            </View>
          ) : null}

          {/* Homestay detail cards */}
          {result.homestaysData.length > 0 && (
            <View style={cr.section}>
              <Text style={cr.sectionTitle}>🏠 Chi tiết từng homestay</Text>
              {result.homestaysData.map((h, i) => (
                <TouchableOpacity
                  key={h.id}
                  style={cr.detailCard}
                  onPress={() => { onClose(); navigation.navigate("HomestayDetail", { id: h.id }); }}
                  activeOpacity={0.85}
                >
                  <View style={[cr.detailAccent, { backgroundColor: scoreColors[i % scoreColors.length] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={cr.detailName} numberOfLines={2}>{h.name}</Text>
                    <View style={cr.detailRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748b" />
                      <Text style={cr.detailLocation} numberOfLines={1}>
                        {[h.districtName, h.provinceName].filter(Boolean).join(", ") || h.address || "Đang cập nhật"}
                      </Text>
                    </View>
                    <View style={cr.detailMeta}>
                      <Text style={cr.detailPrice}>₫{h.pricePerNight.toLocaleString("vi-VN")}/đêm</Text>
                      {(h.averageRating ?? 0) > 0 && (
                        <View style={cr.detailRating}>
                          <MaterialCommunityIcons name="star" size={12} color="#fbbf24" />
                          <Text style={cr.detailRatingText}>{(h.averageRating ?? 0).toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    {h.amenities && h.amenities.length > 0 && (
                      <Text style={cr.detailAmenities} numberOfLines={1}>
                        {h.amenities.slice(0, 4).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const cr = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0891b2", paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginLeft: 8 },
  closeBtn: { padding: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  scoreCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f1f5f9", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  scoreHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  scoreDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  scoreName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#0f172a" },
  matchBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  matchText: { fontSize: 13, fontWeight: "800" },
  analysisBox: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e0f2fe", borderLeftWidth: 4, borderLeftColor: "#0891b2" },
  analysisText: { fontSize: 14, color: "#334155", lineHeight: 22 },
  detailCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f1f5f9", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: "hidden" },
  detailAccent: { width: 4, height: "100%", position: "absolute", left: 0, top: 0, bottom: 0 },
  detailName: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 4, paddingLeft: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, paddingLeft: 8 },
  detailLocation: { fontSize: 12, color: "#64748b", flex: 1, marginLeft: 4 },
  detailMeta: { flexDirection: "row", alignItems: "center", paddingLeft: 8, marginBottom: 4 },
  detailPrice: { fontSize: 13, fontWeight: "700", color: "#059669", marginRight: 12 },
  detailRating: { flexDirection: "row", alignItems: "center" },
  detailRatingText: { fontSize: 12, fontWeight: "700", color: "#f59e0b", marginLeft: 3 },
  detailAmenities: { fontSize: 11, color: "#94a3b8", paddingLeft: 8 },
});

// ── Compare Picker Modal ──────────────────────────────────────────────────────
function ComparePickerModal({
  items,
  onClose,
  onCompare,
}: {
  items: Homestay[];
  onClose: () => void;
  onCompare: (ids: string[], pref: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pref, setPref] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_COMPARE ? [...prev, id] : prev
    );
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={cp.overlay}>
        <View style={cp.sheet}>
          {/* Header */}
          <View style={cp.header}>
            <Text style={cp.title}>Chọn Homestay để So Sánh</Text>
            <TouchableOpacity onPress={onClose} style={cp.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={cp.hint}>Chọn 2–{MAX_COMPARE} homestay để AI phân tích và so sánh</Text>

          {/* List */}
          <ScrollView style={cp.list} showsVerticalScrollIndicator={false}>
            {items.map((h) => {
              const isSelected = selected.includes(h.id);
              const disabled = !isSelected && selected.length >= MAX_COMPARE;
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[cp.item, isSelected && cp.itemSelected, disabled && cp.itemDisabled]}
                  onPress={() => toggle(h.id)}
                  activeOpacity={0.7}
                  disabled={disabled}
                >
                  <Image
                    source={{ uri: h.images?.[0] || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200" }}
                    style={cp.thumb}
                  />
                  <View style={cp.itemInfo}>
                    <Text style={cp.itemName} numberOfLines={2}>{h.name}</Text>
                    <View style={cp.itemLocRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={12} color="#64748b" />
                      <Text style={cp.itemLoc} numberOfLines={1}>
                        {[h.districtName, h.provinceName].filter(Boolean).join(", ") || h.address || "Đang cập nhật"}
                      </Text>
                    </View>
                    <Text style={cp.itemPrice}>₫{h.pricePerNight.toLocaleString("vi-VN")}/đêm</Text>
                  </View>
                  <View style={[cp.checkbox, isSelected && cp.checkboxSelected]}>
                    {isSelected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Preferences input */}
          <View style={cp.prefBox}>
            <TextInput
              style={cp.prefInput}
              placeholder="Nhu cầu của bạn (tùy chọn): VD: đi 4 người, thích yên tĩnh..."
              value={pref}
              onChangeText={setPref}
              placeholderTextColor="#94a3b8"
              multiline
            />
          </View>

          {/* Footer */}
          <View style={cp.footer}>
            <Text style={cp.counter}>{selected.length} / {MAX_COMPARE} đã chọn</Text>
            <TouchableOpacity
              style={[cp.compareBtn, selected.length < 2 && cp.compareBtnDisabled]}
              onPress={() => onCompare(selected, pref)}
              disabled={selected.length < 2}
              activeOpacity={0.85}
            >
              <Text style={cp.compareBtnText}>So Sánh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  closeBtn: { padding: 4 },
  hint: { fontSize: 13, color: "#64748b", paddingHorizontal: 20, marginBottom: 12 },
  list: { maxHeight: 340, paddingHorizontal: 16 },
  item: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: "#f1f5f9", marginBottom: 8, backgroundColor: "#fff" },
  itemSelected: { borderColor: "#0891b2", backgroundColor: "#f0f9ff" },
  itemDisabled: { opacity: 0.4 },
  thumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: "#f1f5f9", marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 3 },
  itemLocRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  itemLoc: { fontSize: 11, color: "#64748b", flex: 1, marginLeft: 3 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#cbd5e1", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  checkboxSelected: { backgroundColor: "#0891b2", borderColor: "#0891b2" },
  prefBox: { marginHorizontal: 16, marginTop: 8, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 },
  prefInput: { fontSize: 13, color: "#1e293b", minHeight: 40 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16 },
  counter: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  compareBtn: { backgroundColor: "#0891b2", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, shadowColor: "#0891b2", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  compareBtnDisabled: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  compareBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WishlistScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  const loadWishlist = useCallback(async () => {
    try {
      const raw = await wishlistService.getMyWishlist();
      setItems(raw?.length ? sortByRating(raw) : []);
    } catch {
      showToast("Không thể tải danh sách yêu thích", "error");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); loadWishlist(); }, [loadWishlist]));

  const handleRefresh = useCallback(() => { setRefreshing(true); loadWishlist(); }, [loadWishlist]);

  const handleRemove = useCallback(async (id: string) => {
    setRemovingId(id);
    try {
      await wishlistService.remove(id);
      setItems((prev) => prev.filter((h) => h.id !== id));
      showToast("Đã xóa khỏi yêu thích", "info");
    } catch {
      showToast("Không thể xóa", "error");
    } finally {
      setRemovingId(null);
    }
  }, []);

  const handleCompare = useCallback(async (ids: string[], pref: string) => {
    setShowPicker(false);
    setComparing(true);
    try {
      const result = await wishlistService.compareHomestays(ids, pref || undefined);
      setCompareResult(result);
    } catch (e: any) {
      showToast(e?.message || "Không thể so sánh homestay", "error");
    } finally {
      setComparing(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Header title="Yêu Thích" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }: { item: Homestay; index: number }) => {
    const isRemoving = removingId === item.id;
    const location = [item.districtName, item.provinceName].filter(Boolean).join(", ") || item.address || "Đang cập nhật";
    const rating = item.averageRating ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("HomestayDetail", { id: item.id, homestay: item })}
        activeOpacity={0.92}
      >
        {/* Image — fixed height */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.images?.[0] || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600" }}
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.imageGradient} />

          {/* Index badge */}
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>#{index + 1}</Text>
          </View>

          {/* Rating badge */}
          {rating > 0 && (
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={12} color="#fbbf24" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              {(item.reviewCount ?? 0) > 0 && (
                <Text style={styles.reviewCountText}> ({item.reviewCount})</Text>
              )}
            </View>
          )}

          {/* Remove button */}
          <TouchableOpacity
            style={[styles.heartBtn, isRemoving && { opacity: 0.4 }]}
            onPress={() => handleRemove(item.id)}
            disabled={isRemoving}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="heart" size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Content — fixed structure, no conditional heights */}
        <View style={styles.cardBody}>
          {/* Name — always 2 lines reserved */}
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

          {/* Location — always 1 line */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={1}>{location}</Text>
          </View>

          {/* Specs row — fixed 3 chips, always same height */}
          <View style={styles.specsRow}>
            <View style={styles.specChip}>
              <MaterialCommunityIcons name="bed-outline" size={12} color="#0891b2" />
              <Text style={styles.specText}>{item.bedrooms ?? 0} phòng</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specChip}>
              <MaterialCommunityIcons name="shower" size={12} color="#0891b2" />
              <Text style={styles.specText}>{item.bathrooms ?? 0} WC</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specChip}>
              <MaterialCommunityIcons name="account-group-outline" size={12} color="#0891b2" />
              <Text style={styles.specText}>{item.maxGuests ?? 0} khách</Text>
            </View>
          </View>

          {/* Price + CTA — always at bottom */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.priceLabel}>Giá từ</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>₫{item.pricePerNight.toLocaleString("vi-VN")}</Text>
                <Text style={styles.priceUnit}>/đêm</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => navigation.navigate("HomestayDetail", { id: item.id, homestay: item })}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Xem ngay</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Header title="Yêu Thích" />

      <FlatList
        data={items}
        keyExtractor={(h) => h.id}
        renderItem={renderItem}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listCount}>{items.length} homestay</Text>
                <Text style={styles.listSub}>Sắp xếp theo đánh giá cao nhất</Text>
              </View>
              {items.length >= 2 && (
                <TouchableOpacity
                  style={[styles.compareBtn, comparing && styles.compareBtnLoading]}
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.85}
                  disabled={comparing}
                >
                  {comparing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="compare" size={15} color="#fff" />
                  )}
                  <Text style={styles.compareBtnText}>
                    {comparing ? "Đang so sánh..." : "So sánh"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Chưa có yêu thích"
            description="Lưu những homestay bạn thích để xem lại sau"
            action={{ label: "Khám phá ngay", onPress: () => navigation.navigate("Home") }}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891b2" />}
      />

      {showPicker && (
        <ComparePickerModal
          items={items}
          onClose={() => setShowPicker(false)}
          onCompare={handleCompare}
        />
      )}

      {compareResult && (
        <CompareResultModal
          result={compareResult}
          onClose={() => setCompareResult(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },

  // Header
  listHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, paddingHorizontal: 2,
  },
  listCount: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  listSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  compareBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0891b2", paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  compareBtnLoading: { backgroundColor: "#64748b", shadowOpacity: 0, elevation: 0 },
  compareBtnText: { fontSize: 13, fontWeight: "700", color: "#fff", marginLeft: 6 },

  // Card — horizontal layout, full width
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },

  // Image — fixed 200px height
  imageWrap: { width: "100%", height: 200, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 100 },

  indexBadge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  indexText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  ratingBadge: {
    position: "absolute", bottom: 12, left: 12,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#fff", marginLeft: 3 },
  reviewCountText: { fontSize: 11, color: "rgba(255,255,255,0.75)" },

  heartBtn: {
    position: "absolute", top: 12, right: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },

  // Card body — fixed structure
  cardBody: { padding: 14 },

  // Name — 2 lines, fixed height ~40px
  cardName: {
    fontSize: 15, fontWeight: "800", color: "#0f172a",
    lineHeight: 20, height: 40, marginBottom: 8,
  },

  // Location — 1 line, fixed height
  infoRow: { flexDirection: "row", alignItems: "center", height: 20, marginBottom: 10 },
  infoText: { fontSize: 12, color: "#64748b", flex: 1, marginLeft: 4 },

  // Specs — always 3 chips in a row, fixed height
  specsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8fafc", borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 12, height: 36,
  },
  specChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  specText: { fontSize: 11, color: "#0891b2", fontWeight: "600", marginLeft: 4 },
  specDivider: { width: 1, height: 14, backgroundColor: "#e2e8f0" },

  // Footer — price + CTA, fixed height
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  priceLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginBottom: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  priceValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  priceUnit: { fontSize: 12, color: "#94a3b8", marginLeft: 3 },

  ctaBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0891b2", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  ctaText: { fontSize: 13, fontWeight: "700", color: "#fff", marginRight: 4 },
});
