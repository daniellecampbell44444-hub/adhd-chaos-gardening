import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useGarden } from '../../context/GardenContext';
import { supabase } from '../../lib/supabase';

type ListingType = 'Seeds' | 'Plant';
type OfferMode = 'Free' | 'For Sale';

interface SwapListing {
  id: string;
  title: string;
  variety: string;
  itemType: ListingType;
  offerMode: OfferMode;
  priceAud?: number;
  quantity: string;
  suburb: string;
  notes: string;
  claimed?: boolean;
  ownerId?: string | null;
}

const SWAP_CACHE_KEY = 'adhd_chaos_gardening_swap_cache_v1';

const STARTER_LISTINGS: SwapListing[] = [
  {
    id: 'swap-starter-1',
    title: 'Cherry Tomato Seeds',
    variety: 'Tommy Toe',
    itemType: 'Seeds',
    offerMode: 'Free',
    quantity: '2 packets (~25 seeds each)',
    suburb: 'Doonside NSW',
    notes: 'Freshly saved from outdoor vines. Happy to share locally!',
  },
  {
    id: 'swap-starter-2',
    title: 'Jalapeño Chilli Potted Plant',
    variety: 'Early Jalapeño',
    itemType: 'Plant',
    offerMode: 'For Sale',
    priceAud: 8,
    quantity: '3 established plants',
    suburb: 'Blacktown NSW',
    notes: 'Hardened off in full sun, ~25cm tall in 140mm pots.',
  },
];

function mapRowToListing(row: any): SwapListing {
  return {
    id: String(row.id),
    title: row.title ?? '',
    variety: row.variety ?? '',
    itemType: row.item_type === 'Plant' ? 'Plant' : 'Seeds',
    offerMode: row.offer_mode === 'For Sale' ? 'For Sale' : 'Free',
    priceAud: row.price_aud != null ? Number(row.price_aud) : undefined,
    quantity: row.quantity ?? '1 available',
    suburb: row.suburb ?? 'Western Sydney NSW',
    notes: row.notes ?? '',
    claimed: Boolean(row.claimed),
    ownerId: row.owner_id ?? null,
  };
}


/* SWAP_PAYMENT_AND_SEED_POSTAGE_RULE */
export const SWAP_PAYMENT_OPTIONS = ["PayID","Cash","Garden Swap","Free"] as const;
export type SwapPaymentOption = (typeof SWAP_PAYMENT_OPTIONS)[number];
export type SwapFulfillmentOption = "Pickup / Swap" | "Postage (Seeds Only)";

export function isSeedSwapCategory(categoryOrType?: string | null): boolean {
  const norm = String(categoryOrType || "").trim().toLowerCase();
  return norm === "seed" || norm === "seeds";
}

export function getAllowedSwapFulfillmentOptions(categoryOrType?: string | null): SwapFulfillmentOption[] {
  return isSeedSwapCategory(categoryOrType)
    ? ["Pickup / Swap", "Postage (Seeds Only)"]
    : ["Pickup / Swap"];
}

export function normalizeSwapFulfillment(
  categoryOrType: string | null | undefined,
  requested?: string | null
): SwapFulfillmentOption {
  if (!isSeedSwapCategory(categoryOrType)) {
    return "Pickup / Swap";
  }
  return requested === "Postage (Seeds Only)" || requested === "Postage"
    ? "Postage (Seeds Only)"
    : "Pickup / Swap";
}

export default function SwapScreen() {
  const { user } = useGarden();

  const [listings, setListings] = useState<SwapListing[]>(STARTER_LISTINGS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [filterOffer, setFilterOffer] = useState<'All' | OfferMode>('All');
  const [filterType, setFilterType] = useState<'All' | ListingType>('All');
  const [modalVisible, setModalVisible] = useState(false);

  // New listing form state
  const [title, setTitle] = useState('');
  const [variety, setVariety] = useState('');
  const [itemType, setItemType] = useState<ListingType>('Seeds');
  const [offerMode, setOfferMode] = useState<OfferMode>('Free');
  const [priceText, setPriceText] = useState('');
  const [quantity, setQuantity] = useState('1 packet');
  const [suburb, setSuburb] = useState('Doonside NSW');
  const [notes, setNotes] = useState('');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('swap_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setIsLive(false);
        const cached = await AsyncStorage.getItem(SWAP_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListings(parsed);
          }
        }
        return;
      }

      setIsLive(true);
      const mapped = (data || []).map(mapRowToListing);
      setListings(mapped);
      await AsyncStorage.setItem(SWAP_CACHE_KEY, JSON.stringify(mapped));
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();

    const channel = supabase
      .channel('swap-listings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swap_listings' },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings]);

  const handleAddListing = async () => {
    if (!title.trim()) {
      Alert.alert('Missing name', 'Add a seed or plant name so people know what you are sharing.');
      return;
    }
    const parsedPrice = offerMode === 'For Sale' ? Number(priceText) : null;
    if (offerMode === 'For Sale' && (!parsedPrice || parsedPrice <= 0)) {
      Alert.alert('Enter a price', 'Add a valid price in $ AUD for items listed For Sale.');
      return;
    }

    setSubmitting(true);
    const newItem: SwapListing = {
      id: `swap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      variety: variety.trim() || 'Heirloom / Mixed',
      itemType,
      offerMode,
      priceAud: parsedPrice ?? undefined,
      quantity: quantity.trim() || '1 available',
      suburb: suburb.trim() || 'Western Sydney NSW',
      notes: notes.trim() || 'Pickup or local swap details on request.',
      claimed: false,
      ownerId: user?.id ?? null,
    };

    const { error } = await supabase.from('swap_listings').insert({
      id: newItem.id,
      title: newItem.title,
      variety: newItem.variety,
      item_type: newItem.itemType,
      offer_mode: newItem.offerMode,
      price_aud: parsedPrice,
      quantity: newItem.quantity,
      suburb: newItem.suburb,
      notes: newItem.notes,
      claimed: false,
      owner_id: user?.id ?? null,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Could not publish', error.message);
      return;
    }

    setListings(prev => [newItem, ...prev]);
    setTitle('');
    setVariety('');
    setPriceText('');
    setQuantity('1 packet');
    setNotes('');
    setModalVisible(false);
  };

  const toggleClaimed = async (item: SwapListing) => {
    const nextClaimed = !item.claimed;
    setListings(prev =>
      prev.map(entry => (entry.id === item.id ? { ...entry, claimed: nextClaimed } : entry))
    );
    const { error } = await supabase
      .from('swap_listings')
      .update({ claimed: nextClaimed })
      .eq('id', item.id);

    if (error) {
      Alert.alert('Update failed', error.message);
      fetchListings();
    }
  };

  const removeListing = (id: string) => {
    Alert.alert('Remove listing?', 'Delete this seed or plant post from the board?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setListings(prev => prev.filter(entry => entry.id !== id));
          const { error } = await supabase.from('swap_listings').delete().eq('id', id);
          if (error) {
            Alert.alert('Delete failed', error.message);
            fetchListings();
          }
        },
      },
    ]);
  };

  const visibleListings = listings.filter(item => {
    const matchesOffer = filterOffer === 'All' || item.offerMode === filterOffer;
    const matchesType = filterType === 'All' || item.itemType === filterType;
    return matchesOffer && matchesType;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>
              {isLive ? 'LIVE SUPABASE BOARD • MULTI-USER' : 'COMMUNITY SEED & PLANT BOARD'}
            </Text>
            <Text style={styles.title}>Swap & Share</Text>
            <Text style={styles.subtitle}>
              List spare seeds or plants to give away free or sell locally.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshChip} onPress={fetchListings}>
              <Ionicons name="refresh" size={16} color="#dcfce7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.postBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle" size={18} color="#ffffff" />
              <Text style={styles.postBtnText}>Post Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.filterBlock}>
        <View style={styles.chipRow}>
          {(['All', 'Free', 'For Sale'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.chip, filterOffer === mode && styles.chipActive]}
              onPress={() => setFilterOffer(mode)}
            >
              <Text style={[styles.chipText, filterOffer === mode && styles.chipTextActive]}>
                {mode === 'All' ? 'All Offers' : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chipRow}>
          {(['All', 'Seeds', 'Plant'] as const).map(kind => (
            <TouchableOpacity
              key={kind}
              style={[styles.chipOutline, filterType === kind && styles.chipOutlineActive]}
              onPress={() => setFilterType(kind)}
            >
              <Text
                style={[
                  styles.chipOutlineText,
                  filterType === kind && styles.chipOutlineTextActive,
                ]}
              >
                {kind === 'All' ? 'Seeds + Plants' : `${kind}s`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && listings.length === 0 ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color="#15803d" />
          <Text style={styles.emptySub}>Loading live community listings...</Text>
        </View>
      ) : visibleListings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="leaf-outline" size={28} color="#15803d" />
          <Text style={styles.emptyTitle}>No matching listings yet</Text>
          <Text style={styles.emptySub}>
            Tap Post Item to share extra seeds or potted plants with other gardeners.
          </Text>
        </View>
      ) : (
        visibleListings.map(item => (
          <View key={item.id} style={[styles.listingCard, item.claimed && styles.claimedCard]}>
            <View style={styles.cardTop}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.offerBadge,
                    item.offerMode === 'Free' ? styles.freeBadge : styles.saleBadge,
                  ]}
                >
                  <Text style={styles.offerBadgeText}>
                    {item.offerMode === 'Free'
                      ? 'FREE / GIVEAWAY'
                      : `FOR SALE • $${item.priceAud?.toFixed(2) ?? '0.00'} AUD`}
                  </Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.itemType.toUpperCase()}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => removeListing(item.id)}>
                <Ionicons name="trash-outline" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemVariety}>
              Variety: {item.variety} • {item.quantity}
            </Text>
            <Text style={styles.itemNotes}>{item.notes}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={14} color="#15803d" />
                <Text style={styles.locText}>{item.suburb}</Text>
              </View>

              <TouchableOpacity
                style={[styles.claimBtn, item.claimed && styles.claimedBtn]}
                onPress={() => toggleClaimed(item)}
              >
                <Text style={[styles.claimBtnText, item.claimed && styles.claimedBtnText]}>
                  {item.claimed ? 'Claimed ✓' : 'Mark Claimed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>List Seeds or a Plant</Text>

            <View style={styles.toggleRow}>
              {(['Seeds', 'Plant'] as const).map(kind => (
                <TouchableOpacity
                  key={kind}
                  style={[styles.togglePill, itemType === kind && styles.togglePillActive]}
                  onPress={() => setItemType(kind)}
                >
                  <Text
                    style={[
                      styles.togglePillText,
                      itemType === kind && styles.togglePillTextActive,
                    ]}
                  >
                    {kind}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              {(['Free', 'For Sale'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.togglePill, offerMode === mode && styles.togglePillActive]}
                  onPress={() => setOfferMode(mode)}
                >
                  <Text
                    style={[
                      styles.togglePillText,
                      offerMode === mode && styles.togglePillTextActive,
                    ]}
                  >
                    {mode === 'Free' ? 'Free / Giveaway' : 'For Sale ($ AUD)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder={
                itemType === 'Seeds'
                  ? 'Seed name (e.g. Sweet Basil Seeds)'
                  : 'Plant name (e.g. Dwarf Lemon Tree)'
              }
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <TextInput
              placeholder="Variety (e.g. Genovese, Tommy Toe, Jalapeño)"
              value={variety}
              onChangeText={setVariety}
              style={styles.input}
            />

            {offerMode === 'For Sale' && (
              <TextInput
                placeholder="Price in $ AUD (e.g. 5 or 12.50)"
                value={priceText}
                onChangeText={setPriceText}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            )}

            <TextInput
              placeholder="Quantity (e.g. 2 packets, 3 pots)"
              value={quantity}
              onChangeText={setQuantity}
              style={styles.input}
            />

            <TextInput
              placeholder="Suburb / Area (e.g. Doonside NSW)"
              value={suburb}
              onChangeText={setSuburb}
              style={styles.input}
            />

            <TextInput
              placeholder="Pickup / swap notes (optional)"
              value={notes}
              onChangeText={setNotes}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddListing}
                disabled={submitting}
              >
                <Text style={styles.saveText}>
                  {submitting ? 'Publishing...' : 'Publish Listing'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  headerCard: { backgroundColor: '#14532d', borderRadius: 20, padding: 18 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    padding: 10,
    borderRadius: 12,
  },
  tag: { color: '#86efac', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#dcfce7', fontSize: 13, marginTop: 4, lineHeight: 18 },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  postBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  filterBlock: { gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#14532d' },
  chipTextActive: { color: '#ffffff' },
  chipOutline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipOutlineActive: { backgroundColor: '#dcfce7', borderColor: '#15803d' },
  chipOutlineText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipOutlineTextActive: { color: '#14532d', fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  emptySub: { fontSize: 13, color: '#475569', textAlign: 'center' },
  listingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  claimedCard: { opacity: 0.72, backgroundColor: '#f8fafc' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  offerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  freeBadge: { backgroundColor: '#dcfce7' },
  saleBadge: { backgroundColor: '#fef3c7' },
  offerBadgeText: { fontSize: 11, fontWeight: '800', color: '#14532d' },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  itemTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  itemVariety: { fontSize: 13, fontWeight: '600', color: '#15803d' },
  itemNotes: { fontSize: 13, color: '#475569', lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  claimBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  claimedBtn: { backgroundColor: '#e2e8f0' },
  claimBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  claimedBtnText: { color: '#475569' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 20, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14532d', marginBottom: 2 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  togglePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  togglePillActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  togglePillText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  togglePillTextActive: { color: '#ffffff' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: '#ffffff', fontWeight: '800' },
});