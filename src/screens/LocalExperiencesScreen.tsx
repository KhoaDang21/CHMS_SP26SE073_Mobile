import { Divider, Header, Input, LoadingIndicator } from "@/components";
import { experienceService } from "@/service/experience/experienceService";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import type { Experience, Homestay } from "@/types";
import { showToast } from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = (width - 44) / 2; // (width - 16*2 - 12) / 2

export default function LocalExperiencesScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [homestays, setHomestays] = useState<Record<string, Homestay>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [detailItem, setDetailItem] = useState<Experience | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [expList, homestayList] = await Promise.all([
                    experienceService.getAll(),
                    publicHomestayService.list({ pageSize: 200 }),
                ]);

                setExperiences(expList.filter((e) => e.isActive));

                const map: Record<string, Homestay> = {};
                homestayList.forEach((h) => { map[h.id] = h; });
                setHomestays(map);
            } catch {
                showToast("Không thể tải danh sách dịch vụ", "error");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const categories = useMemo(() => {
        const cats = new Set(experiences.map((e) => e.category).filter(Boolean) as string[]);
        return Array.from(cats).sort();
    }, [experiences]);

    const filtered = useMemo(() => {
        return experiences.filter((exp) => {
            const matchSearch =
                !searchQuery ||
                exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (exp.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchCat = !selectedCategory || exp.category === selectedCategory;
            return matchSearch && matchCat;
        });
    }, [experiences, searchQuery, selectedCategory]);

    const renderCard = ({ item }: { item: Experience }) => {
        const homestay = item.homestayId ? homestays[item.homestayId] : undefined;
        const priceStr = item.price.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        });

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setDetailItem(item)}
                activeOpacity={0.7}
            >
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.cardImage, styles.noImage]}>
                        <MaterialCommunityIcons name="image-off-outline" size={28} color="#cbd5e1" />
                    </View>
                )}
                <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    {item.category ? <Text style={styles.cardCategory}>{item.category}</Text> : null}
                    {homestay ? (
                        <Text style={styles.cardHomestay} numberOfLines={1}>{homestay.name}</Text>
                    ) : null}
                    <Divider style={styles.cardDivider} />
                    <View style={styles.cardPriceRow}>
                        <Text style={styles.cardPrice}>{priceStr}</Text>
                        <Text style={styles.cardUnit}>/{item.unit || "người"}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const detailHomestay = detailItem?.homestayId ? homestays[detailItem.homestayId] : undefined;

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <Header showBack={false} title="Dịch Vụ Địa Phương" />

            {loading ? (
                <View style={styles.center}>
                    <LoadingIndicator />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderCard}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                            {/* Search */}
                            <Input
                                placeholder="Tìm kiếm dịch vụ..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                icon="magnify"
                            />

                            {/* Category chips */}
                            {categories.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.chipScroll}
                                    style={styles.chipRow}
                                >
                                    <TouchableOpacity
                                        style={[styles.chip, selectedCategory === null && styles.chipActive]}
                                        onPress={() => setSelectedCategory(null)}
                                    >
                                        <Text style={[styles.chipText, selectedCategory === null && styles.chipTextActive]}>
                                            Tất cả
                                        </Text>
                                    </TouchableOpacity>
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                                            onPress={() => setSelectedCategory(cat)}
                                        >
                                            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <MaterialCommunityIcons name="magnify-remove-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>Không tìm thấy dịch vụ nào</Text>
                            <Text style={styles.emptyDesc}>Thử tìm kiếm hoặc thay đổi bộ lọc</Text>
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <Modal
                visible={!!detailItem}
                animationType="slide"
                transparent
                onRequestClose={() => setDetailItem(null)}
                statusBarTranslucent // Quan trọng để modal full màn hình thực sự
            >
                <Pressable style={styles.modalOverlay} onPress={() => setDetailItem(null)}>
                    <View style={styles.modalSheet}>
                        <Pressable style={{ flex: 1 }} onPress={() => { }}>
                            {detailItem && (
                                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                                    {/* Image */}
                                    {detailItem.image ? (
                                        <Image
                                            source={{ uri: detailItem.image }}
                                            style={styles.modalImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.modalImage, styles.noImage]}>
                                            <MaterialCommunityIcons name="image-off-outline" size={40} color="#cbd5e1" />
                                        </View>
                                    )}

                                    <View style={styles.modalBody}>
                                        {/* Category badge */}
                                        {detailItem.category ? (
                                            <View style={styles.modalCategoryBadge}>
                                                <Text style={styles.modalCategoryText}>{detailItem.category}</Text>
                                            </View>
                                        ) : null}

                                        {/* Name */}
                                        <Text style={styles.modalName}>{detailItem.name}</Text>

                                        {/* Price */}
                                        <View style={styles.modalPriceRow}>
                                            <MaterialCommunityIcons name="tag-outline" size={18} color="#059669" />
                                            <Text style={styles.modalPrice}>
                                                {detailItem.price.toLocaleString("vi-VN", {
                                                    style: "currency",
                                                    currency: "VND",
                                                    maximumFractionDigits: 0,
                                                })}
                                            </Text>
                                            <Text style={styles.modalPriceUnit}>/{detailItem.unit || "người"}</Text>
                                        </View>

                                        {/* Description */}
                                        {detailItem.description ? (
                                            <>
                                                <Divider style={{ marginVertical: 12 }} />
                                                <Text style={styles.modalSectionTitle}>Mô tả</Text>
                                                <Text style={styles.modalDescription}>{detailItem.description}</Text>
                                            </>
                                        ) : null}

                                        {/* Homestay info */}
                                        {detailHomestay ? (
                                            <>
                                                <Divider style={{ marginVertical: 12 }} />
                                                <Text style={styles.modalSectionTitle}>Homestay cung cấp</Text>
                                                <View style={styles.modalHomestayCard}>
                                                    {detailHomestay.images?.[0] ? (
                                                        <Image
                                                            source={{ uri: detailHomestay.images[0] }}
                                                            style={styles.modalHomestayImage}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <View style={[styles.modalHomestayImage, styles.noImage]}>
                                                            <MaterialCommunityIcons name="home-outline" size={24} color="#cbd5e1" />
                                                        </View>
                                                    )}
                                                    <View style={styles.modalHomestayInfo}>
                                                        <Text style={styles.modalHomestayName} numberOfLines={2}>
                                                            {detailHomestay.name}
                                                        </Text>
                                                        {(detailHomestay.districtName || detailHomestay.provinceName) ? (
                                                            <View style={styles.modalHomestayLocation}>
                                                                <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748b" />
                                                                <Text style={styles.modalHomestayLocationText} numberOfLines={1}>
                                                                    {[detailHomestay.districtName, detailHomestay.provinceName].filter(Boolean).join(", ")}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                        {detailHomestay.averageRating ? (
                                                            <View style={styles.modalHomestayRating}>
                                                                <MaterialCommunityIcons name="star" size={13} color="#fbbf24" />
                                                                <Text style={styles.modalHomestayRatingText}>
                                                                    {detailHomestay.averageRating.toFixed(1)}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.modalHomestayBtn}
                                                    onPress={() => {
                                                        setDetailItem(null);
                                                        navigation.navigate("HomestayDetail", { id: detailHomestay.id });
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <MaterialCommunityIcons name="home-search-outline" size={18} color="#fff" />
                                                    <Text style={styles.modalHomestayBtnText}>Xem Homestay</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : null}
                                    </View>
                                </ScrollView>
                            )}

                            {/* Close button */}
                            <TouchableOpacity
                                style={[styles.modalCloseBtn, { top: insets.top + 10 }]}
                                onPress={() => setDetailItem(null)}
                            >
                                <MaterialCommunityIcons name="close" size={22} color="#1e293b" />
                            </TouchableOpacity>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f1f5f9" },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },

    chipRow: { marginBottom: 20 },
    chipScroll: { gap: 10, paddingRight: 4 },
    chip: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 22, borderWidth: 1, borderColor: "#e2e8f0",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chipActive: { backgroundColor: "#0891b2", borderColor: "#0891b2" },
    chipText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
    chipTextActive: { color: "#fff" },

    center: { paddingVertical: 80, alignItems: "center", gap: 16 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
    emptyDesc: { fontSize: 14, color: "#64748b" },

    row: { gap: 12, marginBottom: 12 },
    grid: { paddingBottom: 20 },

    card: {
        width: ITEM_WIDTH,
        borderRadius: 18,
        backgroundColor: "#fff",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#f1f5f9",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardImage: { width: "100%", height: 140, backgroundColor: "#f8fafc" },
    noImage: { justifyContent: "center", alignItems: "center" },
    cardBody: { padding: 12 },
    cardName: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginBottom: 4, lineHeight: 18 },
    cardCategory: { fontSize: 11, color: "#0891b2", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" },
    cardHomestay: { fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: "500" },
    cardDivider: { marginVertical: 8, backgroundColor: "#f1f5f9" },
    cardPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
    cardPrice: { fontSize: 14, fontWeight: "800", color: "#059669" },
    cardUnit: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: "#fff",
        height: height, // Full screen height
        overflow: "hidden",
    },
    modalCloseBtn: {
        position: "absolute",
        right: 16,
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modalImage: {
        width: "100%",
        height: 300,
        backgroundColor: "#f1f5f9",
    },
    modalBody: { padding: 20, paddingBottom: 40 },
    modalCategoryBadge: {
        alignSelf: "flex-start",
        backgroundColor: "#ecfeff",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#cffafe",
    },
    modalCategoryText: { fontSize: 13, fontWeight: "600", color: "#0891b2" },
    modalName: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 12, lineHeight: 28 },
    modalPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    modalPrice: { fontSize: 22, fontWeight: "800", color: "#059669" },
    modalPriceUnit: { fontSize: 15, color: "#64748b", fontWeight: "500" },
    modalSectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
    modalDescription: { fontSize: 15, color: "#475569", lineHeight: 24 },

    modalHomestayCard: {
        flexDirection: "row",
        gap: 14,
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 16,
    },
    modalHomestayImage: {
        width: 80, height: 80,
        borderRadius: 12,
        backgroundColor: "#e2e8f0",
    },
    modalHomestayInfo: { flex: 1, justifyContent: "center", gap: 5 },
    modalHomestayName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
    modalHomestayLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
    modalHomestayLocationText: { fontSize: 13, color: "#64748b", flex: 1 },
    modalHomestayRating: { flexDirection: "row", alignItems: "center", gap: 4 },
    modalHomestayRatingText: { fontSize: 13, fontWeight: "700", color: "#0f172a" },

    modalHomestayBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: "#0891b2",
        borderRadius: 16,
        paddingVertical: 15,
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modalHomestayBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
