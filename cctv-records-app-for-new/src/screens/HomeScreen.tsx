import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import {
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SelectablePill,
} from "../components/ui";
import { getSites } from "../api/siteService";
import { useAuth } from "../contexts/AuthContext";
import { SitesStackParamList } from "../navigation";
import { Role, RmsScope, Site } from "../types";
import { STATUS_STEPS, formatDate, rmsScopeLabel } from "../utils/helpers";
import {
  colors,
  fontSize,
  radius,
  scopeColor,
  shadow,
  spacing,
  statusColor,
} from "../theme";

type Nav = NativeStackNavigationProp<SitesStackParamList>;
type Rt = RouteProp<SitesStackParamList, "SitesList">;

const StatusDots: React.FC<{ site: Site }> = ({ site }) => (
  <View style={styles.statusRow}>
    {STATUS_STEPS.map((step) => {
      const done = !!site.status?.[step.key]?.done;
      return (
        <View key={step.key} style={styles.statusCol}>
          <View
            style={[
              styles.dot,
              done
                ? { backgroundColor: statusColor[step.key] }
                : styles.dotPending,
            ]}
          >
            {done && <Ionicons name="checkmark" size={11} color="#fff" />}
          </View>
          <AppText style={styles.statusLabel}>{step.label}</AppText>
        </View>
      );
    })}
  </View>
);

const SiteCard: React.FC<{ site: Site; onPress: () => void }> = ({
  site,
  onPress,
}) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
    <View style={styles.cardHead}>
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <AppText style={styles.cardTitle}>{site.siteName}</AppText>
        <AppText style={styles.cardSub}>
          {site.tawalId} · {site.siteCity}
        </AppText>
        <AppText style={styles.cardRegion}>{site.region}</AppText>
      </View>
      <Chip
        label={rmsScopeLabel(site.rmsScope)}
        color={scopeColor[site.rmsScope]}
        small
      />
    </View>
    <StatusDots site={site} />
    <View style={styles.cardFoot}>
      <AppText style={styles.muted}>
        Created {formatDate(site.createdAt)}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </View>
  </TouchableOpacity>
);

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { role } = useAuth();
  const isAdmin = role === Role.ADMIN;
  // Only admin can create sites; managers can assign/review but no longer
  // create new ones.
  const canCreate = isAdmin;

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the region filter from the route param so the dashboard's region
  // drill-down lands on the pre-filtered list. Region is free-text now so we
  // accept any string the navigator hands us.
  const initialRegion = route.params?.region ?? "";

  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>(initialRegion);
  const [filterScope, setFilterScope] = useState<RmsScope | "">("");
  const [filterOpen, setFilterOpen] = useState(false);

  // If the user navigates here with a new region param (e.g. tapping a
  // different dashboard card while the tab is already mounted) we want the
  // filter to update.
  useEffect(() => {
    if (typeof route.params?.region === "string") {
      setFilterRegion(route.params.region);
    }
  }, [route.params?.region]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await getSites();
    console.log(res);
    if (res.success && res.data) setSites(res.data);
    else setError(res.message ?? "Failed to load sites");
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (filterRegion && s.region !== filterRegion) return false;
      if (filterScope && s.rmsScope !== filterScope) return false;
      if (q) {
        const blob =
          `${s.siteName} ${s.tawalId} ${s.siteCity} ${s.tcnNumber}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [sites, search, filterRegion, filterScope]);

  const activeFilterCount = (filterRegion ? 1 : 0) + (filterScope ? 1 : 0);

  // Region options come from whatever region strings exist in the loaded
  // sites — keep the active filter in the list even if the dataset would
  // otherwise hide it, so the user can always unselect it.
  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) if (s.region) set.add(s.region);
    if (filterRegion) set.add(filterRegion);
    return [...set].sort();
  }, [sites, filterRegion]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <Field
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, Tawal ID, city, TCNs"
            style={{ marginBottom: 0 }}
          />
        </View>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={[
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
          ]}
        >
          <Ionicons
            name="filter"
            size={20}
            color={activeFilterCount > 0 ? "#fff" : colors.brand}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterDot}>
              <AppText style={styles.filterDotText}>
                {activeFilterCount}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SiteCard
              site={item}
              onPress={() =>
                navigation.navigate("SiteDetail", { siteId: item._id })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="◌"
              title={
                sites.length === 0
                  ? role === Role.TECHNICIAN
                    ? "No sites assigned yet"
                    : "No sites yet"
                  : "No sites match the filters"
              }
              subtitle={
                sites.length === 0 && canCreate
                  ? "Tap + to create your first site."
                  : undefined
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={colors.brand}
            />
          }
        />
      )}

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddSite")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <FilterModal
        open={filterOpen}
        region={filterRegion}
        scope={filterScope}
        regionOptions={regionOptions}
        onChangeRegion={setFilterRegion}
        onChangeScope={setFilterScope}
        onClose={() => setFilterOpen(false)}
        onClear={() => {
          setFilterRegion("");
          setFilterScope("");
        }}
      />
    </View>
  );
};

const FilterModal: React.FC<{
  open: boolean;
  region: string;
  scope: RmsScope | "";
  regionOptions: string[];
  onChangeRegion: (r: string) => void;
  onChangeScope: (s: RmsScope | "") => void;
  onClose: () => void;
  onClear: () => void;
}> = ({
  open,
  region,
  scope,
  regionOptions,
  onChangeRegion,
  onChangeScope,
  onClose,
  onClear,
}) => (
  <Modal
    visible={open}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <View style={styles.modalHead}>
          <AppText style={styles.modalTitle}>Filters</AppText>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <AppText style={styles.modalSection}>Region</AppText>
        <View style={styles.pillWrap}>
          {regionOptions.length === 0 && (
            <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
              No regions in the data yet.
            </AppText>
          )}
          {regionOptions.map((r) => (
            <SelectablePill
              key={r}
              label={r}
              active={region === r}
              onPress={() => onChangeRegion(region === r ? "" : r)}
            />
          ))}
        </View>

        <AppText style={styles.modalSection}>Scope</AppText>
        <View style={styles.pillWrap}>
          {Object.values(RmsScope).map((s) => (
            <SelectablePill
              key={s}
              label={rmsScopeLabel(s)}
              active={scope === s}
              onPress={() => onChangeScope(scope === s ? "" : s)}
            />
          ))}
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity onPress={onClear} style={{ padding: spacing.sm }}>
            <AppText style={{ color: colors.textMuted, fontWeight: "600" }}>
              Clear all
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.modalApply}>
            <AppText style={{ color: "#fff", fontWeight: "700" }}>
              Apply
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: colors.brand },
  filterDot: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brand,
  },
  filterDotText: { color: colors.brand, fontSize: 9, fontWeight: "700" },

  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 96,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  cardSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  cardRegion: { fontSize: fontSize.xs, color: colors.textFaint, marginTop: 2 },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  muted: { fontSize: fontSize.xs, color: colors.textFaint },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statusCol: { alignItems: "center", flex: 1 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotPending: { backgroundColor: colors.border },
  statusLabel: { fontSize: 9, color: colors.textMuted, marginTop: 3 },

  fab: {
    position: "absolute",
    right: 22,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.brand,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,26,46,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "85%",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.h2, fontWeight: "700", color: colors.text },
  modalSection: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  pillWrap: { flexDirection: "row", flexWrap: "wrap" },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  modalApply: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
});
