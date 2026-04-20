import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface RecommendedHomestay {
    id?: string;
    Id?: string;
    name?: string;
    Name?: string;
    address?: string;
    Address?: string;
    price?: number;
    Price?: number;
    description?: string;
    Description?: string;
    amenities?: string;
    Amenities?: string;
    thumbnailUrl?: string;
    ThumbnailUrl?: string;
    rating?: number;
    Rating?: number;
}

interface AiBubbleContentProps {
    message: string;
    recommendedHomestays?: RecommendedHomestay[];
    isRecommendation?: boolean;
    onNavigateToHomestay?: (id: string) => void;
}

/**
 * Format message into lines/bullets — đồng bộ với FE web
 */
function formatMessage(text: string): string[] {
    if (!text || typeof text !== 'string') return [''];

    text = text.trim();
    if (!text) return [''];

    // Bullet/dash formatting
    if (text.includes('●') || text.includes('•')) {
        return text
            .split(/[●•]/)
            .map(line => line.replace(/^[-\s]+/, '').trim())
            .filter(line => line.length > 0);
    }

    if (text.includes('\n-') || text.includes('\n•')) {
        return text
            .split('\n')
            .map(line => line.replace(/^[-•\s]+/, '').trim())
            .filter(line => line.length > 0);
    }

    // Numbered list
    if (/^\d+\./.test(text)) {
        return text
            .split(/\n\d+\./)
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    // Short text — keep as single item (no bullet)
    if (text.length < 150) {
        return [text];
    }

    // Try splitting on Vietnamese sentence patterns
    const sentences = text
        .split(/(?<=[.!?])\s+(?=[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])/g)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (sentences.length > 1) return sentences;

    // Split on commas for long text
    if (text.length > 200) {
        const parts = text
            .split(/[,;]/)
            .map(p => p.trim())
            .filter(p => p.length > 15);
        if (parts.length > 1) return parts;
    }

    // Newlines fallback
    if (text.includes('\n')) {
        const parts = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (parts.length > 0) return parts;
    }

    return [text];
}

function HomestayCard({ homestay, onNavigate }: { homestay: RecommendedHomestay; onNavigate?: (id: string) => void }) {
    const navigation = useNavigation<any>();

    const id = homestay.id || homestay.Id || '';
    const name = homestay.name || homestay.Name || 'Homestay';
    const address = homestay.address || homestay.Address || 'Đang cập nhật';
    const price = homestay.price || homestay.Price || 0;
    const description = homestay.description || homestay.Description || '';
    const amenities = homestay.amenities || homestay.Amenities || '';
    const thumbnail = homestay.thumbnailUrl || homestay.ThumbnailUrl || '';
    const rating = homestay.rating || homestay.Rating || 0;

    const handlePress = () => {
        if (onNavigate) {
            onNavigate(id);
        } else {
            navigation.navigate('HomestayDetail', { id });
        }
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            <View style={styles.cardImageContainer}>
                {thumbnail ? (
                    <Image source={{ uri: thumbnail }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                    <View style={styles.cardImagePlaceholder}>
                        <MaterialCommunityIcons name="image-off" size={40} color="#999" />
                    </View>
                )}
            </View>

            <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={2}>{name}</Text>

                <View style={styles.cardRow}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                    <Text style={styles.cardAddress} numberOfLines={1}>{address}</Text>
                </View>

                <View style={styles.cardRow}>
                    <Text style={styles.cardPrice}>{price.toLocaleString('vi-VN')}₫</Text>
                    <Text style={styles.cardPriceUnit}>/đêm</Text>
                </View>

                {rating > 0 && (
                    <View style={styles.cardRow}>
                        <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.cardRating}>{rating.toFixed(1)}/5</Text>
                    </View>
                )}

                {description ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
                ) : null}

                {amenities ? (
                    <View style={styles.amenitiesBox}>
                        <Text style={styles.cardAmenities} numberOfLines={1}>🏠 {amenities}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={styles.bookButton}
                    onPress={handlePress}
                    activeOpacity={0.8}
                >
                    <Text style={styles.bookButtonText}>Xem & Đặt</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

export const AiBubbleContent = ({
    message,
    recommendedHomestays,
    isRecommendation,
    onNavigateToHomestay,
}: AiBubbleContentProps) => {
    const lines = formatMessage(message);
    const hasHomestays = isRecommendation && Array.isArray(recommendedHomestays) && recommendedHomestays.length > 0;

    return (
        <View style={styles.container}>
            {/* Text content */}
            <View style={styles.textContainer}>
                {lines.map((line, idx) => {
                    const cleanLine = line.replace(/^[-•\d.]\s*/, '').trim();
                    if (!cleanLine) return null;

                    return (
                        <View key={idx} style={styles.lineRow}>
                            {lines.length > 1 && (
                                <Text style={styles.bullet}>●</Text>
                            )}
                            <Text style={styles.lineText}>{cleanLine}</Text>
                        </View>
                    );
                })}
            </View>

            {/* Recommended homestay cards */}
            {hasHomestays && (
                <ScrollView
                    style={styles.cardsSectionScroll}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.cardsSection}>
                        <Text style={styles.cardsSectionTitle}>🏠 Gợi ý cho bạn:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {recommendedHomestays!.map((homestay, idx) => (
                                <View key={idx} style={styles.cardWrapper}>
                                    <HomestayCard homestay={homestay} onNavigate={onNavigateToHomestay} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // Removed flex: 1 to prevent layout issues in bubble
    },
    textContainer: {
        // gap replaced with marginBottom in lineRow
    },
    lineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    bullet: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: 'bold',
        marginTop: 3,
        marginRight: 6,
        flexShrink: 0,
    },
    lineText: {
        flexShrink: 1,
        fontSize: 14,
        color: '#1e293b',
        lineHeight: 21,
    },
    cardsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        marginHorizontal: -8,
        maxHeight: 320,
    },
    cardsSectionScroll: {
        maxHeight: 320,
    },
    cardsSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    scrollContent: {
        paddingHorizontal: 8,
    },
    cardWrapper: {
        width: 220,
        marginRight: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    cardImageContainer: {
        width: '100%',
        height: 130,
        backgroundColor: '#f3f4f6',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        paddingHorizontal: 13,
        paddingVertical: 12,
        height: 270,
        justifyContent: 'space-between',
    },
    cardName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 20,
        marginBottom: 8,
        height: 40,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 7,
        gap: 8,
    },
    cardAddress: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1,
        lineHeight: 16,
        maxHeight: 32,
    },
    cardPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    cardPriceUnit: {
        fontSize: 11,
        color: '#6b7280',
        marginLeft: 2,
    },
    cardRating: {
        fontSize: 13,
        fontWeight: '600',
        color: '#f59e0b',
        marginLeft: 4,
    },
    cardDescription: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 17,
        maxHeight: 40,
    },
    amenitiesBox: {
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#fbbf24',
        marginTop: 2,
        height: 36,
    },
    cardAmenities: {
        fontSize: 12,
        color: '#92400e',
        lineHeight: 17,
        fontWeight: '500',
        maxHeight: 34,
    },
    bookButton: {
        marginTop: 10,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#0891b2',
        alignItems: 'center',
    },
    bookButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
});
