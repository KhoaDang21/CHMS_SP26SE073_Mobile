import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  culturalGuidesService,
  type CulturalGuide,
} from "@/service/culturalGuides/culturalGuidesService";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { showToast } from "@/utils/toast";
import { colors } from "@/utils/colors";

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDE_TYPES = ["all", "Experience", "Food", "Tips", "Announcement", "News"] as const;
type GuideType = (typeof GUIDE_TYPES)[number];

const TYPE_LABELS: Record<GuideType, string> = {
  all: "Tất cả",
  Experience: "Trải nghiệm",
  Food: "Ẩm thực",
  Tips: "Mẹo hay",
  Announcement: "Thông báo",
  News: "Tin tức",
};

const TYPE_ICONS: Record<GuideType, string> = {
  all: "view-grid-outline",
  Experience: "hiking",
  Food: "food-fork-drink",
  Tips: "lightbulb-outline",
  Announcement: "bullhorn-outline",
  News: "newspaper-variant-outline",
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED: { bg: "#d1fae5", text: "#065f46", label: "Đã duyệt" },
  PENDING: { bg: "#fef3c7", text: "#92400e", label: "Chờ duyệt" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b", label: "Bị từ chối" },
  PUBLISHED: { bg: "#dbeafe", text: "#1e40af", label: "Đã đăng" },
};

function getStatusConfig(raw?: string) {
  const key = String(raw || "").toUpperCase();
  return STATUS_CONFIG[key] ?? { bg: "#f3f4f6", text: "#6b7280", label: raw || "—" };
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeChip({
  type,
  active,
  onPress,
}: {
  type: GuideType;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.typeChip, active && styles.typeChipActive]}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={TYPE_ICONS[type] as any}
        size={14}
        color={active ? "#fff" : colors.text.secondary}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
        {TYPE_LABELS[type]}
      </Text>
    </TouchableOpacity>
  );
}

function GuideCard({
  guide,
  onPress,
}: {
  guide: CulturalGuide;
  onPress: () => void;
}) {
  const status = getStatusConfig(guide.status);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {!!guide.image && (
        <Image
          source={{ uri: guide.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          {!!guide.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{guide.type}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusBadgeText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {guide.title}
        </Text>
        <Text style={styles.cardContent} numberOfLines={3}>
          {guide.content || guide.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <MaterialCommunityIcons name="account-outline" size={13} color={colors.text.tertiary} />
            <Text style={styles.cardFooterText}>{guide.author || "Ẩn danh"}</Text>
          </View>
          {!!guide.location && (
            <View style={styles.cardFooterLeft}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.text.tertiary} />
              <Text style={styles.cardFooterText} numberOfLines={1}>{guide.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {!!guide.views && (
            <View style={styles.cardFooterLeft}>
              <MaterialCommunityIcons name="eye-outline" size={13} color={colors.text.tertiary} />
              <Text style={styles.cardFooterText}>{guide.views} lượt xem</Text>
            </View>
          )}
          {!!guide.createdAt && (
            <Text style={styles.cardDate}>{formatDate(guide.createdAt)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MyGuideRow({ guide }: { guide: CulturalGuide }) {
  const status = getStatusConfig(guide.status);
  return (
    <View style={styles.myGuideRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.myGuideTitle} numberOfLines={1}>{guide.title}</Text>
        <Text style={styles.myGuideContent} numberOfLines={1}>
          {guide.content || guide.description}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.bg, marginLeft: 8 }]}>
        <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
      </View>
    </View>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  guide,
  onClose,
}: {
  guide: CulturalGuide | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!guide) return null;
  const status = getStatusConfig(guide.status);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.detailBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>Chi tiết bài viết</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.detailScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {guide.imageUrls && guide.imageUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageGallery}>
              {guide.imageUrls.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
              ))}
            </ScrollView>
          )}

          <View style={styles.detailContent}>
            <View style={styles.cardMeta}>
              {!!guide.type && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{guide.type}</Text>
                </View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>

            <Text style={styles.detailTitle}>{guide.title}</Text>

            <View style={styles.detailMetaRow}>
              <MaterialCommunityIcons name="account-outline" size={14} color={colors.text.tertiary} />
              <Text style={styles.detailMetaText}>{guide.author || "Ẩn danh"}</Text>
              {!!guide.createdAt && (
                <>
                  <Text style={styles.detailMetaDot}>·</Text>
                  <Text style={styles.detailMetaText}>{formatDate(guide.createdAt)}</Text>
                </>
              )}
            </View>

            {!!guide.location && (
              <View style={styles.detailMetaRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.text.tertiary} />
                <Text style={styles.detailMetaText}>{guide.location}</Text>
              </View>
            )}

            {!!guide.views && (
              <View style={styles.detailMetaRow}>
                <MaterialCommunityIcons name="eye-outline" size={14} color={colors.text.tertiary} />
                <Text style={styles.detailMetaText}>{guide.views} lượt xem</Text>
              </View>
            )}

            <View style={styles.divider} />
            <Text style={styles.detailBody}>{guide.content || guide.description}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<Exclude<GuideType, "all">>("Experience");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const reset = () => {
    setTitle("");
    setContent("");
    setType("Experience");
    setImageUris([]);
    setShowTypePicker(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Cần quyền truy cập thư viện ảnh", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setImageUris(result.assets.slice(0, 5).map((a) => a.uri));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { showToast("Vui lòng nhập tiêu đề", "warning"); return; }
    if (!content.trim()) { showToast("Vui lòng nhập nội dung", "warning"); return; }

    setSubmitting(true);
    try {
      const result = await culturalGuidesService.createGuide({
        title: title.trim(),
        content: content.trim(),
        type,
        imageUris,
      });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast(result.message, "success");
      reset();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = GUIDE_TYPES.filter((t) => t !== "all") as Exclude<GuideType, "all">[];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.detailBack} disabled={submitting}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle}>Đăng bài cẩm nang</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Đăng</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.createScroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={styles.fieldLabel}>Tiêu đề <Text style={{ color: "#ef4444" }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tiêu đề bài viết..."
              placeholderTextColor={colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />

            {/* Type picker */}
            <Text style={styles.fieldLabel}>Loại bài viết</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowTypePicker(!showTypePicker)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={TYPE_ICONS[type] as any}
                size={16}
                color={colors.primary[500]}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.selectBtnText}>{TYPE_LABELS[type]}</Text>
              <MaterialCommunityIcons
                name={showTypePicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
            {showTypePicker && (
              <View style={styles.typePickerList}>
                {typeOptions.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePickerItem, type === t && styles.typePickerItemActive]}
                    onPress={() => { setType(t); setShowTypePicker(false); }}
                  >
                    <MaterialCommunityIcons
                      name={TYPE_ICONS[t] as any}
                      size={15}
                      color={type === t ? colors.primary[500] : colors.text.secondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.typePickerItemText, type === t && { color: colors.primary[500], fontWeight: "600" }]}>
                      {TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Content */}
            <Text style={styles.fieldLabel}>Nội dung <Text style={{ color: "#ef4444" }}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Chia sẻ trải nghiệm, mẹo du lịch, thông tin hữu ích..."
              placeholderTextColor={colors.text.tertiary}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            {/* Images */}
            <Text style={styles.fieldLabel}>Hình ảnh (tối đa 5)</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImages} activeOpacity={0.8}>
              <MaterialCommunityIcons name="image-plus" size={20} color={colors.primary[500]} />
              <Text style={styles.imagePickerText}>
                {imageUris.length > 0 ? `Đã chọn ${imageUris.length} ảnh` : "Chọn ảnh từ thư viện"}
              </Text>
            </TouchableOpacity>
            {imageUris.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {imageUris.map((uri, i) => (
                  <View key={i} style={{ marginRight: 8 }}>
                    <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImageUris((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.noteBox}>
              <MaterialCommunityIcons name="information-outline" size={15} color="#0369a1" style={{ marginRight: 6 }} />
              <Text style={styles.noteText}>
                Bài viết sẽ được kiểm duyệt trước khi hiển thị công khai.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TravelGuidesScreen() {
  const insets = useSafeAreaInsets();
  const [guides, setGuides] = useState<CulturalGuide[]>([]);
  const [myGuides, setMyGuides] = useState<CulturalGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<GuideType>("all");
  const [search, setSearch] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<CulturalGuide | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    tokenStorage.getToken().then((t) => setIsAuthenticated(!!t));
  }, []);

  const loadGuides = useCallback(async (type: GuideType = selectedType) => {
    try {
      const data = await culturalGuidesService.getPublicGuides(type === "all" ? undefined : type);
      setGuides(data);
    } catch {
      showToast("Không thể tải bài viết", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType]);

  const loadMyGuides = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await culturalGuidesService.getMyGuides();
      setMyGuides(data);
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    loadGuides(selectedType);
  }, [selectedType]);

  useEffect(() => {
    loadMyGuides();
  }, [loadMyGuides]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadGuides(selectedType);
    loadMyGuides();
  }, [selectedType, loadGuides, loadMyGuides]);

  const handleTypeChange = (type: GuideType) => {
    setSelectedType(type);
    setSearch("");
  };

  const filteredGuides = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.content || "").toLowerCase().includes(q) ||
        (g.author || "").toLowerCase().includes(q) ||
        (g.location || "").toLowerCase().includes(q),
    );
  }, [guides, search]);

  const renderGuide = useCallback(
    ({ item }: { item: CulturalGuide }) => (
      <GuideCard guide={item} onPress={() => setSelectedGuide(item)} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.primary[500]} />
          <Text style={styles.headerTitle}>Cẩm nang du lịch</Text>
        </View>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Đăng bài</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hero banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroTitle}>Kinh nghiệm từ cộng đồng CHMS</Text>
        <Text style={styles.heroSubtitle}>
          Chia sẻ trải nghiệm thực tế, mẹo du lịch và thông tin hữu ích
        </Text>
      </View>

      {/* Search + Filter wrapper */}
      <View style={styles.filterWrapper}>
        {/* Search */}
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tiêu đề, nội dung, tác giả..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.searchClear}>
              <MaterialCommunityIcons name="close-circle" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChipsRow}
          style={styles.typeChipsScroll}
        >
          {GUIDE_TYPES.map((t) => (
            <TypeChip
              key={t}
              type={t}
              active={selectedType === t}
              onPress={() => handleTypeChange(t)}
            />
          ))}
        </ScrollView>
      </View>

      {/* My guides section */}
      {isAuthenticated && myGuides.length > 0 && (
        <View style={styles.myGuidesSection}>
          <Text style={styles.sectionTitle}>Bài viết của tôi</Text>
          {myGuides.slice(0, 3).map((g) => (
            <MyGuideRow key={g.id} guide={g} />
          ))}
        </View>
      )}

      {/* Guide list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGuides}
          keyExtractor={(item) => item.id}
          renderItem={renderGuide}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
              <Text style={styles.emptySubtitle}>
                {search ? "Thử tìm kiếm với từ khóa khác" : "Hãy là người đầu tiên chia sẻ!"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail modal */}
      <DetailModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />

      {/* Create modal */}
      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          handleRefresh();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Hero
  heroBanner: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 17,
  },

  // Search
  filterWrapper: {
    width: "100%",
    backgroundColor: "#f8fafc",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    height: 42,
    alignSelf: "stretch",
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    paddingVertical: 0,
    minWidth: 0,
  },
  searchClear: { padding: 4 },

  // Type chips
  typeChipsScroll: { maxHeight: 48 },
  typeChipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  typeChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text.secondary,
  },
  typeChipTextActive: {
    color: "#fff",
  },

  // My guides
  myGuidesSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 10,
  },
  myGuideRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  myGuideTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },
  myGuideContent: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Card
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 180,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369a1",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
    lineHeight: 21,
  },
  cardContent: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  cardFooterText: {
    fontSize: 12,
    color: colors.text.tertiary,
    flex: 1,
  },
  cardDate: {
    fontSize: 11,
    color: colors.text.tertiary,
  },

  // Empty / Loading
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: "center",
  },

  // Detail modal
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  detailBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  detailScroll: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  imageGallery: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  galleryImage: {
    width: 280,
    height: 180,
    borderRadius: 12,
    marginRight: 10,
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text.primary,
    lineHeight: 28,
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailMetaText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  detailMetaDot: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginHorizontal: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
  detailBody: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },

  // Create modal
  createScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 4,
  },
  submitBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.secondary,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 140,
    paddingTop: 12,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#fff",
  },
  selectBtnText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "500",
  },
  typePickerList: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 4,
    overflow: "hidden",
  },
  typePickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  typePickerItemActive: {
    backgroundColor: "#eff6ff",
  },
  typePickerItemText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: "500",
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#fff",
    borderRadius: 9,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e0f2fe",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#0369a1",
    lineHeight: 17,
  },
});
