import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useSaveSiteDraftMutation,
  useSubmitSiteMutation,
} from "@/hooks/useSites";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { MaterialDetails } from "@/components/MaterialDetails";
import {
  type ImagedSerialTag,
  RmsScope,
  type SimSwapSiteType,
  type SiteUnitsPayload,
  type Site,
} from "@/types";
import { apiErrorMessage, readFileAsDataUrl } from "@/utils/helpers";
import {
  buildFieldEntrySchema,
  getZodFieldErrors,
} from "@/utils/fieldEntryValidation";
import {
  useRmsSerialsQuery,
  useSimSerialsQuery,
  useSmartLockSerialsQuery,
} from "@/hooks/useSerials";
import Select from "react-select";

const emptyUnits = (count: number): ImagedSerialTag[] =>
  Array.from({ length: Math.max(count, 0) }, () => ({}));

type UnitGroupKey =
  | "rmsUnits"
  | "expanderUnits"
  | "simCards"
  | "fenceLockUnits"
  | "oduUnits"
  | "smartMeterUnits"
  | "ctSplitUnits"
  | "silboGatewayUnits"
  | "cctvCameraUnits"
  | "hardDiskUnits"
  | "nvrUnits";

interface UnitGroup {
  key: UnitGroupKey;
  label: string;
  count: number;
  needs: { serial: boolean; tag: boolean };
}
const relevantUnitGroups = (site: Site): UnitGroup[] => {
  const out: UnitGroup[] = [];
  if (site.rmsScope === RmsScope.RMS) {
    out.push({
      key: "rmsUnits",
      label: "RMS Units",
      count: site.numberOfRms,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "expanderUnits",
      label: "Expanders",
      count: site.numberOfExpanders,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
    if (site.hasSmartLock) {
      out.push({
        key: "fenceLockUnits",
        label: "Fence Locks",
        count: site.numberOfFenceLocks,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "oduUnits",
        label: "ODUs",
        count: site.numberOfOdus,
        needs: { serial: true, tag: false },
      });
    }
    if (site.hasSmartMeter) {
      out.push({
        key: "smartMeterUnits",
        label: "Smart Meters",
        count: site.numberOfSmartMeters,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "ctSplitUnits",
        label: "CT Splits",
        count: site.numberOfCtSplits,
        needs: { serial: true, tag: true },
      });
    }
  } else if (site.rmsScope === RmsScope.SMART_LOCK) {
    out.push({
      key: "fenceLockUnits",
      label: "Fence Locks",
      count: site.numberOfFenceLocks,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "oduUnits",
      label: "ODUs",
      count: site.numberOfOdus,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SMART_METER) {
    out.push({
      key: "smartMeterUnits",
      label: "Smart Meters",
      count: site.numberOfSmartMeters,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "ctSplitUnits",
      label: "CT Splits",
      count: site.numberOfCtSplits,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "silboGatewayUnits",
      label: "Silbo Gateways",
      count: site.numberOfSilboGateways,
      needs: { serial: true, tag: true },
    });
    // Smart-meter sites always ship with one SIM card for the Silbo gateway.
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SIM_SWAP) {
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
    if (site.hasSmartLock) {
      out.push({
        key: "fenceLockUnits",
        label: "Fence Locks",
        count: site.numberOfFenceLocks,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "oduUnits",
        label: "ODUs",
        count: site.numberOfOdus,
        needs: { serial: true, tag: false },
      });
    }
    if (site.hasSmartMeter) {
      out.push({
        key: "smartMeterUnits",
        label: "Smart Meters",
        count: site.numberOfSmartMeters,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "ctSplitUnits",
        label: "CT Splits",
        count: site.numberOfCtSplits,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "silboGatewayUnits",
        label: "Silbo Gateways",
        count: site.numberOfSilboGateways,
        needs: { serial: true, tag: true },
      });
    }
  } else if (site.rmsScope === RmsScope.CCTV) {
    out.push({
      key: "cctvCameraUnits",
      label: "CCTV Cameras",
      count: site.numberOfCameras,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "hardDiskUnits",
      label: "Hard Disks",
      count: site.numberOfHardDisks,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "nvrUnits",
      label: "NVRs",
      count: site.numberOfNvr,
      needs: { serial: true, tag: true },
    });
  } else if (site.rmsScope === RmsScope.LEGACY_POO_METER) {
    out.push({
      key: "smartMeterUnits",
      label: "Smart Meters",
      count: site.numberOfSmartMeters,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "ctSplitUnits",
      label: "CT Splits",
      count: site.numberOfCtSplits,
      needs: { serial: true, tag: true },
    });
  } else if (site.rmsScope === RmsScope.COLLOCATION_METER) {
    out.push({
      key: "smartMeterUnits",
      label: "Smart Meters",
      count: site.numberOfSmartMeters,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "ctSplitUnits",
      label: "CT Splits",
      count: site.numberOfCtSplits,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "fenceLockUnits",
      label: "Fence Locks",
      count: site.numberOfFenceLocks,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "oduUnits",
      label: "ODUs",
      count: site.numberOfOdus,
      needs: { serial: true, tag: false },
    });
  }
  return out;
};
export const FieldEntryForm: React.FC<{ site: Site }> = ({ site }) => {
  const saveDraft = useSaveSiteDraftMutation();
  const submit = useSubmitSiteMutation();
  const readOnly = site.status?.completed?.done;
  const simQuery = useSimSerialsQuery();
  const availableSims = simQuery.data ?? [];
  const Smartlock = useSmartLockSerialsQuery();
  const availableSmartLock = Smartlock.data ?? [];
  const Rms = useRmsSerialsQuery();
  const availableRms = Rms.data ?? [];

  const groups = useMemo(() => {
    let all = relevantUnitGroups(site);
    // Exclude simCards for SIM_SWAP scope since they use the dedicated SIM swap pairs form instead
    if (site.rmsScope === RmsScope.SIM_SWAP) {
      all = all.filter((g) => g.key !== "simCards");
    }
    return all;
  }, [site]);

  const initial = useMemo<SiteUnitsPayload>(() => {
    const out: SiteUnitsPayload = {};
    for (const g of groups) {
      const existing = (site as any)[g.key] as ImagedSerialTag[] | undefined;
      const blanks = emptyUnits(g.count);
      const seeded = blanks.map((blank, i) => existing?.[i] ?? blank);
      (out as Record<UnitGroupKey, ImagedSerialTag[]>)[g.key] = seeded;
    }
    // carry over any existing SIM swap specific details
    (out as any).simSwapComments = (site as any).simSwapComments ?? "";
    (out as any).simSwapPairs = (site as any).simSwapPairs ?? [];
    (out as any).simSwapSiteType = (site as any).simSwapSiteType ?? "";
    (out as any).simSwapLatitude = (site as any).simSwapLatitude ?? null;
    (out as any).simSwapLongitude = (site as any).simSwapLongitude ?? null;
    const existingTenants = (site as any).simSwapTenants ?? [];
    const tenantBlanks = Array.from(
      { length: site.numberOfTenants ?? 0 },
      () => ({
        tenantName: "",
        tenantCtCapacities: ["", "", ""],
      }),
    );
    (out as any).simSwapTenants = tenantBlanks.map((blank, i) => {
      const existing = existingTenants[i] ?? {};
      return {
        tenantName: existing.tenantName ?? blank.tenantName,
        tenantCtCapacities:
          existing.tenantCtCapacities ?? blank.tenantCtCapacities,
      };
    });
    // Seed materials sub-object
    out.materials = {
      numberOfRms: site.materials?.numberOfRms ?? 0,
      numberOfExpanders: site.materials?.numberOfExpanders ?? 0,
      numberOfSims: site.materials?.numberOfSims ?? 0,
      numberOfFenceLocks: site.materials?.numberOfFenceLocks ?? 0,
      numberOfShelterLocks: site.materials?.numberOfShelterLocks ?? 0,
      numberOfOdus: site.materials?.numberOfOdus ?? 0,
      numberOfSmartMeters: site.materials?.numberOfSmartMeters ?? 0,
      numberOfCtSplits: site.materials?.numberOfCtSplits ?? 0,
      numberOfSilboGateways: site.materials?.numberOfSilboGateways ?? 0,
    };
    // Seed counts
    out.numberOfRms = site.numberOfRms ?? 0;
    out.numberOfExpanders = site.numberOfExpanders ?? 0;
    out.numberOfSims = site.numberOfSims ?? 0;
    out.numberOfFenceLocks = site.numberOfFenceLocks ?? 0;
    out.numberOfShelterLocks = site.numberOfShelterLocks ?? 0;
    out.numberOfOdus = site.numberOfOdus ?? 0;
    out.numberOfSmartMeters = site.numberOfSmartMeters ?? 0;
    out.numberOfCtSplits = site.numberOfCtSplits ?? 0;
    out.numberOfSilboGateways = site.numberOfSilboGateways ?? 0;
    out.numberOfCameras = site.numberOfCameras ?? 0;
    out.numberOfHardDisks = site.numberOfHardDisks ?? 0;
    out.numberOfNvr = site.numberOfNvr ?? 0;
    // Seed CCTV Installation Photos
    out.cctvNvrPhoto = site.cctvNvrPhoto ?? "";
    out.cctvNvrMainBoxPhoto = site.cctvNvrMainBoxPhoto ?? "";
    out.cctvFullSitePhoto = site.cctvFullSitePhoto ?? "";

    const cCount = Math.max(0, site.numberOfCameras ?? 0);
    const hdCount = Math.max(0, site.numberOfHardDisks ?? 0);

    const seededCameraPhotos = Array.from({ length: cCount }, (_, i) => {
      return (
        site.cctvCameraPhotos?.[i] ??
        (i === 0 ? (site.cctvCameraPhoto ?? "") : "")
      );
    });
    const seededHardDiskPhotos = Array.from({ length: hdCount }, (_, i) => {
      return (
        site.cctvHardDiskPhotos?.[i] ??
        (i === 0 ? (site.cctvHardDiskPhoto ?? "") : "")
      );
    });

    out.cctvCameraPhotos = seededCameraPhotos;
    out.cctvHardDiskPhotos = seededHardDiskPhotos;
    out.cctvCameraPhoto = seededCameraPhotos[0] ?? site.cctvCameraPhoto ?? "";
    out.cctvHardDiskPhoto =
      seededHardDiskPhotos[0] ?? site.cctvHardDiskPhoto ?? "";
    out.otherSitePhotos = site.otherSitePhotos ?? [];
    return out;
  }, [site, groups]);

  const [values, setValues] = useState<SiteUnitsPayload>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  useEffect(() => {
    setValues(initial);
  }, [initial]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cameraCount = Math.max(0, site.numberOfCameras ?? 0);
  const hardDiskCount = Math.max(0, site.numberOfHardDisks ?? 0);

  const updateCctvCameraPhoto = (idx: number, v?: string) => {
    clearFieldError(`cctvCameraPhotos.${idx}`);
    clearFieldError("cctvCameraPhotos");
    clearFieldError("cctvCameraPhoto");
    setValues((prev) => {
      const arr = [...(prev.cctvCameraPhotos ?? [])];
      while (arr.length <= idx) arr.push("");
      arr[idx] = v ?? "";
      return {
        ...prev,
        cctvCameraPhotos: arr,
        cctvCameraPhoto: arr[0] ?? "",
      };
    });
  };

  const updateCctvHardDiskPhoto = (idx: number, v?: string) => {
    clearFieldError(`cctvHardDiskPhotos.${idx}`);
    clearFieldError("cctvHardDiskPhotos");
    clearFieldError("cctvHardDiskPhoto");
    setValues((prev) => {
      const arr = [...(prev.cctvHardDiskPhotos ?? [])];
      while (arr.length <= idx) arr.push("");
      arr[idx] = v ?? "";
      return {
        ...prev,
        cctvHardDiskPhotos: arr,
        cctvHardDiskPhoto: arr[0] ?? "",
      };
    });
  };

  const updateUnit = (
    groupKey: UnitGroupKey,
    idx: number,
    patch: Partial<ImagedSerialTag>,
  ) => {
    setValues((prev) => {
      const arr = [
        ...((prev[groupKey] as ImagedSerialTag[] | undefined) ?? []),
      ];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [groupKey]: arr };
    });
    if (patch.serialNumber !== undefined) {
      clearFieldError(`${groupKey}.${idx}.serialNumber`);
    }
    if (patch.tagNumber !== undefined) {
      clearFieldError(`${groupKey}.${idx}.tagNumber`);
    }
  };

  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({
        id: site._id,
        payload: values as SiteUnitsPayload,
      });
      toast.success("Draft saved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save draft"));
    }
  };

  const onGetLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setLocationBusy(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((prev) => ({
          ...(prev ?? {}),
          simSwapLatitude: position.coords.latitude,
          simSwapLongitude: position.coords.longitude,
        }));
        setLocationBusy(false);
      },
      (error) => {
        setLocationBusy(false);
        setLocationError(
          error.message || "Unable to fetch your current location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const onSubmit = async () => {
    // ── Zod validation ────────────────────────────────────────────────────
    const schema = buildFieldEntrySchema(site, groups);
    const result = schema.safeParse(values);
    if (!result.success) {
      const errors = getZodFieldErrors(result);
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (
      !window.confirm(
        "Submit field data? You will not be able to edit afterward.",
      )
    )
      return;
    try {
      await submit.mutateAsync({
        id: site._id,
        payload: values as SiteUnitsPayload,
      });
      toast.success("Site submitted for review");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to submit"));
    }
  };

  if (
    groups.length === 0 &&
    site.rmsScope !== RmsScope.SIM_SWAP &&
    site.rmsScope !== RmsScope.CCTV
  ) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">
          No field unit data is required for this scope.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="card">
        <div className="card-body">
          <label className="label" htmlFor="sim-swap-comments">
            Comments (optional)
          </label>
          <textarea
            id="sim-swap-comments"
            className="input min-h-[88px] resize-y"
            placeholder="Add any notes, comments or SIM swap details..."
            value={(values as any).simSwapComments ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...(prev ?? {}),
                simSwapComments: e.target.value,
              }))
            }
            maxLength={2000}
            disabled={readOnly}
          />
        </div>
      </div>
      {site.rmsScope === RmsScope.SIM_SWAP && (
        <div className="card">
          <div className="card-body space-y-4">
            <h3 className="card-title">SIM swap details</h3>

            {/* SIM Pairs - repeat for each SIM */}
            {Array.from({ length: site.numberOfSims }, (_, i) => {
              const pairs = (values as any).simSwapPairs ?? [];
              const pair = pairs[i] ?? {};

              const updatePair = (idx: number, patch: Partial<typeof pair>) => {
                setValues((prev) => {
                  const newPairs = [...((prev as any).simSwapPairs ?? [])];
                  newPairs[idx] = { ...newPairs[idx], ...patch };
                  return { ...(prev ?? {}), simSwapPairs: newPairs };
                });
                if (patch.newSerialNumber !== undefined) {
                  clearFieldError(`simSwapPairs.${idx}.newSerialNumber`);
                }
                if (patch.oldSerialNumber !== undefined) {
                  clearFieldError(`simSwapPairs.${idx}.oldSerialNumber`);
                }
              };

              const newSimErr =
                fieldErrors[`simSwapPairs.${i}.newSerialNumber`];
              const oldSimErr =
                fieldErrors[`simSwapPairs.${i}.oldSerialNumber`];

              return (
                <div key={i} className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    SIM #{i + 1}
                  </p>

                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex w-full flex-col">
                        <label className="label mb-1 block">
                          New SIM serial number *
                        </label>
                        <Select
                          options={availableSims.map((s) => ({
                            value: s.serialNumber,
                            label: s.serialNumber,
                          }))}
                          value={
                            pair.newSerialNumber
                              ? {
                                  value: pair.newSerialNumber,
                                  label: pair.newSerialNumber,
                                }
                              : null
                          }
                          isDisabled={readOnly}
                          onChange={(selected) =>
                            updatePair(i, {
                              newSerialNumber: selected?.value ?? "",
                            })
                          }
                          isClearable
                          isSearchable
                          placeholder="Search SIM..."
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: "0.5rem",
                              borderColor: newSimErr ? "#ef4444" : "#e2e8f0",
                              boxShadow: "none",
                              "&:hover": {
                                borderColor: newSimErr ? "#ef4444" : "#cbd5e1",
                              },
                            }),
                            input: (base) => ({
                              ...base,
                              "input:focus": { boxShadow: "none" },
                            }),
                          }}
                        />
                        {newSimErr && (
                          <p className="helper-text">{newSimErr}</p>
                        )}
                      </div>
                      {!readOnly ? (
                        <ImageUploadField
                          label="New SIM image"
                          value={pair.newSerialImage}
                          onChange={(v) => updatePair(i, { newSerialImage: v })}
                        />
                      ) : pair.newSerialImage ? (
                        <div>
                          <p className="label">New SIM image</p>
                          <img
                            src={pair.newSerialImage}
                            alt="New SIM"
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Old SIM serial number *"
                        value={pair.oldSerialNumber ?? ""}
                        error={oldSimErr}
                        disabled={readOnly}
                        onChange={(e) =>
                          updatePair(i, { oldSerialNumber: e.target.value })
                        }
                      />
                      {!readOnly ? (
                        <ImageUploadField
                          label="Old SIM image"
                          value={pair.oldSerialImage}
                          onChange={(v) => updatePair(i, { oldSerialImage: v })}
                        />
                      ) : pair.oldSerialImage ? (
                        <div>
                          <p className="label">Old SIM image</p>
                          <img
                            src={pair.oldSerialImage}
                            alt="Old SIM"
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Site Type and Location - shown once */}
            <SelectField
              label="Site type *"
              placeholder="Select site type"
              value={(values as any).simSwapSiteType ?? ""}
              error={fieldErrors["simSwapSiteType"]}
              disabled={readOnly}
              onChange={(e) => {
                clearFieldError("simSwapSiteType");
                setValues((prev) => ({
                  ...(prev ?? {}),
                  simSwapSiteType: e.target.value as SimSwapSiteType,
                }));
              }}
              options={[
                { label: "Green field", value: "green_field" },
                { label: "Roof top", value: "roof_top" },
              ]}
            />
            <div className="space-y-2">
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onGetLocation}
                  loading={locationBusy}
                >
                  Get current location
                </Button>
              )}
              {locationError && (
                <p className="text-sm text-red-600">{locationError}</p>
              )}
              {typeof (values as any).simSwapLatitude === "number" &&
                typeof (values as any).simSwapLongitude === "number" && (
                  <p className="text-sm text-slate-700 px-2 py-1 rounded-lg bg-slate-200">
                    Latitude: {(values as any).simSwapLatitude} | Longitude:{" "}
                    {(values as any).simSwapLongitude}
                  </p>
                )}
            </div>

            {/* Tenant details - dynamic based on number of tenants */}
            {site.numberOfTenants > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-slate-800 text-sm">
                  Tenant Details
                </h4>
                {Array.from({ length: site.numberOfTenants }, (_, i) => {
                  const tenantsList = (values as any).simSwapTenants ?? [];
                  const tenant = tenantsList[i] ?? {};

                  const updateTenant = (
                    idx: number,
                    patch: Partial<typeof tenant>,
                  ) => {
                    setValues((prev) => {
                      const newTenants = [
                        ...((prev as any).simSwapTenants ?? []),
                      ];
                      newTenants[idx] = { ...newTenants[idx], ...patch };
                      return { ...(prev ?? {}), simSwapTenants: newTenants };
                    });
                  };

                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 p-4 space-y-4 bg-slate-50/50"
                    >
                      <p className="text-sm font-semibold text-slate-700">
                        Tenant #{i + 1}
                      </p>
                      <div className="space-y-4">
                        <TextField
                          label="Tenant name"
                          value={tenant.tenantName ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateTenant(i, { tenantName: e.target.value })
                          }
                          placeholder="Enter tenant name"
                        />
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                          {[1, 2, 3].map((phaseNum) => {
                            const capacities = tenant.tenantCtCapacities ?? [
                              "",
                              "",
                              "",
                            ];
                            const capValue = capacities[phaseNum - 1] ?? "";
                            return (
                              <SelectField
                                key={phaseNum}
                                label={`Tenant CT capacity phase #${phaseNum}`}
                                placeholder="Select capacity"
                                value={capValue}
                                disabled={readOnly}
                                onChange={(e) => {
                                  const nextCaps = [...capacities];
                                  nextCaps[phaseNum - 1] = e.target.value;
                                  updateTenant(i, {
                                    tenantCtCapacities: nextCaps,
                                  });
                                }}
                                options={[
                                  { label: "200x5", value: "200x5" },
                                  { label: "150x5", value: "150x5" },
                                ]}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {groups.map((g) => {
        const arr = (values[g.key] as ImagedSerialTag[] | undefined) ?? [];
        const singular = g.label.endsWith("s") ? g.label.slice(0, -1) : g.label;
        return (
          <div key={g.key} className="card">
            <div className="card-body space-y-3">
              <h3 className="card-title">
                {g.label} ({g.count})
              </h3>
              <div className="space-y-4">
                {arr.map((u, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="mb-3 text-sm font-semibold text-slate-800">
                      {singular} #{idx + 1}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {g.needs.serial && (
                        <>
                          {(() => {
                            const serialErr =
                              fieldErrors[`${g.key}.${idx}.serialNumber`];
                            // Pick the right serial list based on the group key
                            const serialOptions =
                              g.key === "rmsUnits"
                                ? (availableRms ?? []).map((s) => ({
                                    value: s.serialNumber,
                                    label: s.serialNumber,
                                  }))
                                : g.key === "simCards"
                                  ? availableSims.map((s) => ({
                                      value: s.serialNumber,
                                      label: s.serialNumber,
                                    }))
                                  : g.key === "fenceLockUnits" ||
                                      g.key === "oduUnits"
                                    ? (availableSmartLock ?? []).map((s) => ({
                                        value: s.serialNumber,
                                        label: s.serialNumber,
                                      }))
                                    : null;

                            return serialOptions ? (
                              <div className="flex w-full flex-col">
                                <label className="label mb-1 block">
                                  Serial number *
                                </label>
                                <Select
                                  options={serialOptions}
                                  value={
                                    u.serialNumber
                                      ? {
                                          value: u.serialNumber,
                                          label: u.serialNumber,
                                        }
                                      : null
                                  }
                                  isDisabled={readOnly}
                                  onChange={(selected) =>
                                    updateUnit(g.key, idx, {
                                      serialNumber: selected?.value ?? "",
                                    })
                                  }
                                  isClearable
                                  isSearchable
                                  placeholder="Search serial..."
                                  styles={{
                                    control: (base) => ({
                                      ...base,
                                      borderRadius: "0.5rem",
                                      borderColor: serialErr
                                        ? "#ef4444"
                                        : "#e2e8f0",
                                      boxShadow: "none",
                                      "&:hover": {
                                        borderColor: serialErr
                                          ? "#ef4444"
                                          : "#cbd5e1",
                                      },
                                    }),
                                    input: (base) => ({
                                      ...base,
                                      "input:focus": { boxShadow: "none" },
                                    }),
                                  }}
                                />
                                {serialErr && (
                                  <p className="helper-text">{serialErr}</p>
                                )}
                              </div>
                            ) : (
                              <TextField
                                label="Serial number *"
                                value={u.serialNumber ?? ""}
                                error={serialErr}
                                disabled={readOnly}
                                onChange={(e) =>
                                  updateUnit(g.key, idx, {
                                    serialNumber: e.target.value,
                                  })
                                }
                              />
                            );
                          })()}
                          {!readOnly ? (
                            <ImageUploadField
                              label="Serial image"
                              value={u.serialImage}
                              onChange={(v) =>
                                updateUnit(g.key, idx, { serialImage: v })
                              }
                            />
                          ) : u.serialImage ? (
                            <div>
                              <p className="label">Serial image</p>
                              <img
                                src={u.serialImage}
                                alt=""
                                className="h-24 w-24 rounded-lg object-cover"
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                      {g.needs.tag && (
                        <>
                          <TextField
                            label="Tag number *"
                            value={u.tagNumber ?? ""}
                            error={fieldErrors[`${g.key}.${idx}.tagNumber`]}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateUnit(g.key, idx, {
                                tagNumber: e.target.value,
                              })
                            }
                          />
                          {!readOnly ? (
                            <ImageUploadField
                              label="Tag image"
                              value={u.tagImage}
                              onChange={(v) =>
                                updateUnit(g.key, idx, { tagImage: v })
                              }
                            />
                          ) : u.tagImage ? (
                            <div>
                              <p className="label">Tag image</p>
                              <img
                                src={u.tagImage}
                                alt=""
                                className="h-24 w-24 rounded-lg object-cover"
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {arr.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No units configured for this group.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {/* CCTV Site Installation Images */}
      {site.rmsScope === RmsScope.CCTV && (
        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <h3 className="card-title">Site Installation Images</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload photos of the installed equipment and full site view.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                {!readOnly ? (
                  <ImageUploadField
                    label="NVR Photo *"
                    value={values.cctvNvrPhoto}
                    error={fieldErrors.cctvNvrPhoto}
                    onChange={(v) => {
                      clearFieldError("cctvNvrPhoto");
                      setValues((prev) => ({ ...prev, cctvNvrPhoto: v }));
                    }}
                  />
                ) : values.cctvNvrPhoto ? (
                  <div>
                    <p className="label">NVR Photo</p>
                    <img
                      src={values.cctvNvrPhoto}
                      alt="NVR Photo"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No NVR photo</p>
                )}
              </div>

              <div>
                {!readOnly ? (
                  <ImageUploadField
                    label="NVR Main Box Photo *"
                    value={values.cctvNvrMainBoxPhoto}
                    error={fieldErrors.cctvNvrMainBoxPhoto}
                    onChange={(v) => {
                      clearFieldError("cctvNvrMainBoxPhoto");
                      setValues((prev) => ({
                        ...prev,
                        cctvNvrMainBoxPhoto: v,
                      }));
                    }}
                  />
                ) : values.cctvNvrMainBoxPhoto ? (
                  <div>
                    <p className="label">NVR Main Box Photo</p>
                    <img
                      src={values.cctvNvrMainBoxPhoto}
                      alt="NVR Main Box Photo"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No NVR main box photo
                  </p>
                )}
              </div>

              {/* Dynamic CCTV Camera Photos */}
              {Array.from({ length: cameraCount }, (_, idx) => {
                const label =
                  cameraCount > 1
                    ? `CCTV Camera #${idx + 1} Photo *`
                    : "CCTV Camera Photo *";
                const err =
                  fieldErrors[`cctvCameraPhotos.${idx}`] ||
                  (idx === 0 ? fieldErrors.cctvCameraPhotos : undefined);
                const photoUrl =
                  values.cctvCameraPhotos?.[idx] ||
                  (idx === 0 ? values.cctvCameraPhoto : "");
                return (
                  <div key={`cctv-camera-photo-${idx}`}>
                    {!readOnly ? (
                      <ImageUploadField
                        label={label}
                        value={photoUrl}
                        error={err}
                        onChange={(v) => updateCctvCameraPhoto(idx, v)}
                      />
                    ) : photoUrl ? (
                      <div>
                        <p className="label">{label.replace(" *", "")}</p>
                        <img
                          src={photoUrl}
                          alt={label}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No {label.replace(" *", "").toLowerCase()}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Dynamic Hard Disk Photos */}
              {Array.from({ length: hardDiskCount }, (_, idx) => {
                const label =
                  hardDiskCount > 1
                    ? `Hard Disk #${idx + 1} Photo *`
                    : "Hard Disk Photo *";
                const err =
                  fieldErrors[`cctvHardDiskPhotos.${idx}`] ||
                  (idx === 0 ? fieldErrors.cctvHardDiskPhotos : undefined);
                const photoUrl =
                  values.cctvHardDiskPhotos?.[idx] ||
                  (idx === 0 ? values.cctvHardDiskPhoto : "");
                return (
                  <div key={`cctv-harddisk-photo-${idx}`}>
                    {!readOnly ? (
                      <ImageUploadField
                        label={label}
                        value={photoUrl}
                        error={err}
                        onChange={(v) => updateCctvHardDiskPhoto(idx, v)}
                      />
                    ) : photoUrl ? (
                      <div>
                        <p className="label">{label.replace(" *", "")}</p>
                        <img
                          src={photoUrl}
                          alt={label}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No {label.replace(" *", "").toLowerCase()}
                      </p>
                    )}
                  </div>
                );
              })}

              <div>
                {!readOnly ? (
                  <ImageUploadField
                    label="Full Site Photo *"
                    value={values.cctvFullSitePhoto}
                    error={fieldErrors.cctvFullSitePhoto}
                    onChange={(v) => {
                      clearFieldError("cctvFullSitePhoto");
                      setValues((prev) => ({ ...prev, cctvFullSitePhoto: v }));
                    }}
                  />
                ) : values.cctvFullSitePhoto ? (
                  <div>
                    <p className="label">Full Site Photo</p>
                    <img
                      src={values.cctvFullSitePhoto}
                      alt="Full Site Photo"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No full site photo</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Material Details for SIM_SWAP - shown in both edit and read-only modes */}
      {site.rmsScope === RmsScope.SIM_SWAP && (
        <>
          <MaterialDetails
            label="Material Details"
            value={values}
            setValues={setValues}
            readOnly={readOnly}
          />
        </>
      )}

      {/* Dynamic Other Site Photos card for all scopes */}
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title">Other Site Photos</h3>
            <p className="text-sm text-slate-500">
              Upload additional photos of the site installation
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5 !px-3 !py-1.5 !text-xs font-semibold"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (e: Event) => {
                  const target = e.target as HTMLInputElement;
                  const file = target.files?.[0];
                  if (file) {
                    try {
                      const url = await readFileAsDataUrl(file);
                      setValues((prev) => ({
                        ...prev,
                        otherSitePhotos: [...(prev.otherSitePhotos ?? []), url],
                      }));
                    } catch {
                      toast.error("Failed to read image");
                    }
                  }
                };
                input.click();
              }}
            >
              <span className="text-sm font-bold">+</span> Add Photo
            </button>
          )}
        </div>

        {values.otherSitePhotos && values.otherSitePhotos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {values.otherSitePhotos.map((url, idx) => (
              <div
                key={`other-site-photo-${idx}`}
                className="group relative flex flex-col rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <div className="h-32 w-full overflow-hidden rounded-md bg-slate-200">
                  <img
                    src={url}
                    alt={`Other Site Photo #${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Photo #{idx + 1}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                      onClick={() => {
                        setValues((prev) => {
                          const arr = [...(prev.otherSitePhotos ?? [])];
                          arr.splice(idx, 1);
                          return { ...prev, otherSitePhotos: arr };
                        });
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-slate-400">
            No other site photos added yet.
          </p>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            loading={saveDraft.isPending}
          >
            Save draft
          </Button>
          <Button type="button" onClick={onSubmit} loading={submit.isPending}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
};
