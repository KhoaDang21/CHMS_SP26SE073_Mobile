import { Button } from "./Button";
import type { Experience } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState, useMemo } from "react";

export interface SelectedExperience {
  item: Experience;
  qty: number;
}

interface ExperiencePickerModalV2Props {
  visible: boolean;
  experiences: Experience[];
  selected?: SelectedExperience[];
  title?: string;
  onConfirm: (selected: SelectedExperience[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

export function ExperiencePickerModalV2({
  visible,
  experiences,
  selected = [],
  title = "Chọn Dịch Vụ",
  onConfirm,
  onCancel,
  loading = false,
}: ExperiencePickerModalV2Props) {
  // Track: { experienceId: qty }
  const [tempQtys, setTempQtys] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    selected.forEach((s) => {
      map[s.item.id] = s.qty;
    });
    return map;
  });

  const handleQtyChange = (id: string, delta: number) => {
    const current = tempQtys[id] ?? 0;
    const newQty = current + delta;
    const updated = { ...tempQtys };

    if (newQty > 0 && newQty <= 9) {
      updated[id] = newQty;
    } else if (newQty <= 0) {
      delete updated[id];
    }
    setTempQtys(updated);
  };

  const handleConfirm = () => {
    const result: SelectedExperience[] = Object.entries(tempQtys)
      .map(([id, qty]) => {
        const exp = experiences.find((e) => e.id === id);
        return exp ? { item: exp, qty } : null;
      })
      .filter((x): x is SelectedExperience => x !== null);

    onConfirm(result);
  };

  const totalPrice = useMemo(() => {
    return Object.entries(tempQtys).reduce((sum, [id, qty]) => {
      const exp = experiences.find((e) => e.id === id);
      return sum + (exp?.price ?? 0) * qty;
    }, 0);
  }, [tempQtys, experiences]);

  const renderItem = ({ item }: { item: Experience }) => {
    const qty = tempQtys[item.id] ?? 0;
    const isSelected = qty > 0;

    return (
      <View
        style={[
          styles.itemContainer,
          isSelected && styles.itemContainerSelected,
        ]}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.itemDesc} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
          <Text style={styles.price}>{fmt(item.price)}</Text>
        </View>

        {/* Quantity Controls */}
        <View style={styles.qtyControls}>
          {isSelected ? (
            <>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => handleQtyChange(item.id, -1)}
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={18}
                  color="#0891b2"
                />
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyText}>{qty}</Text>
              </View>
              <TouchableOpacity
                style={[styles.qtyButton, qty >= 9 && styles.qtyButtonDisabled]}
                onPress={() => handleQtyChange(item.id, 1)}
                disabled={qty >= 9}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={18}
                  color={qty >= 9 ? "#cbd5e1" : "#0891b2"}
                />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleQtyChange(item.id, 1)}
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={24}
                color="#0891b2"
              />
              <Text style={styles.addText}>Thêm</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const content = (
    <View style={styles.content}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={32} color="#0891b2" />
          <Text style={styles.loadingText}>Đang tải dịch vụ...</Text>
        </View>
      ) : experiences.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="inbox-outline"
            size={48}
            color="#cbd5e1"
          />
          <Text style={styles.emptyText}>Không có dịch vụ nào</Text>
        </View>
      ) : (
        <FlatList
          data={experiences}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <Modal visible={visible} animationType="slide" onShow={() => {}}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} hitSlop={10}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color="#1e293b"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          {content}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalPrice}>{fmt(totalPrice)}</Text>
            </View>
            <Button
              onPress={handleConfirm}
              title="Xác nhận"
              disabled={Object.keys(tempQtys).length === 0}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        {content}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalPrice}>{fmt(totalPrice)}</Text>
          </View>
          <Button
            onPress={handleConfirm}
            title="Xác nhận"
            disabled={Object.keys(tempQtys).length === 0}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  itemContainer: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 8,
  },
  itemContainerSelected: {
    borderColor: "#0891b2",
    backgroundColor: "#f0f9ff",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  itemDesc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  categoryText: {
    fontSize: 11,
    color: "#0369a1",
    fontWeight: "600",
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0891b2",
    marginTop: 4,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0891b2",
  },
  addText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0891b2",
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#0891b2",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyButtonDisabled: {
    opacity: 0.5,
  },
  qtyDisplay: {
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#0891b2",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0891b2",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#94a3b8",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
  },
  footerTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0891b2",
  },
});
