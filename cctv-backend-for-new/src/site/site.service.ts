import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Site, SiteDocument, RmsScope } from './site.schema';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SubmitSiteDto } from './dto/submit-site.dto';
import {
  ListSitesQueryDto,
  SiteStatusFilter,
} from './dto/list-sites-query.dto';
import { Role } from '../user/role.enum';
import { User, UserDocument } from '../user/user.schema';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ──────────────────────────────────────────────────────────────────────
  // Scope-aware count derivation (smart meter math, scope cleanup)
  // ──────────────────────────────────────────────────────────────────────

  // One smart meter serves up to three tenants — round up so partial groups
  // still get a meter (e.g. 1 to 3 tenants get 1 meter, 4 to 6 tenants get 2 meters).
  // For SIM_SWAP scope: 1 tenant = 1 smart meter (e.g. 3 tenants = 3 smart meters).
  private static smartMetersFor(tenants: number, scope?: RmsScope): number {
    if (tenants <= 0) return 0;
    if (scope === RmsScope.SIM_SWAP) {
      return tenants;
    }
    return Math.ceil(tenants / 3);
  }

  // Returns a payload with all counts normalized for the given scope.
  // Computed fields (numberOfSmartMeters / numberOfCtSplits /
  // numberOfSilboGateways) are always derived here so persisted data stays
  // consistent regardless of what the client sent.
  private deriveCounts(input: Partial<Site>): Partial<Site> {
    const out: Partial<Site> = { ...input };
    const scope = input.rmsScope as RmsScope | undefined;

    // Default everything to 0/false so flipping scopes resets stale fields.
    out.numberOfRms = 0;
    out.numberOfExpanders = 0;
    out.numberOfSims = 0;
    out.hasSmartLock = false;
    out.numberOfFenceLocks = 0;
    out.numberOfShelterLocks = 0;
    out.numberOfOdus = 0;
    out.hasSmartMeter = false;
    out.numberOfTenants = 0;
    out.numberOfSmartMeters = 0;
    out.numberOfCtSplits = 0;
    out.numberOfSilboGateways = 0;
    out.numberOfCameras = 0;
    out.numberOfHardDisks = 0;
    out.numberOfNvr = 0;

    // Item code is a free-text code applicable to any selected scope, so it's
    // always carried through regardless of which scope is picked.
    out.itemCode = input.itemCode ?? '';

    if (scope === RmsScope.RMS) {
      out.numberOfRms = input.numberOfRms ?? 0;
      out.numberOfExpanders = input.numberOfExpanders ?? 0;
      out.numberOfSims = input.numberOfSims ?? 0;
      out.hasSmartLock = !!input.hasSmartLock;
      if (out.hasSmartLock) {
        out.numberOfFenceLocks = input.numberOfFenceLocks ?? 0;
        out.numberOfShelterLocks = input.numberOfShelterLocks ?? 0;
        out.numberOfOdus = input.numberOfOdus ?? 0;
      }
      out.hasSmartMeter = !!input.hasSmartMeter;
      if (out.hasSmartMeter) {
        const tenants = input.numberOfTenants ?? 0;
        out.numberOfTenants = tenants;
        out.numberOfSmartMeters = SiteService.smartMetersFor(tenants, scope);
        out.numberOfCtSplits = tenants * 3;
        // RMS scope intentionally excludes silbo gateways.
      }
    } else if (scope === RmsScope.SMART_LOCK) {
      out.hasSmartLock = true;
      out.numberOfFenceLocks = input.numberOfFenceLocks ?? 0;
      out.numberOfShelterLocks = input.numberOfShelterLocks ?? 0;
      out.numberOfOdus = input.numberOfOdus ?? 0;
    } else if (scope === RmsScope.SMART_METER) {
      out.hasSmartMeter = true;
      const tenants = input.numberOfTenants ?? 0;
      out.numberOfTenants = tenants;
      out.numberOfSmartMeters = SiteService.smartMetersFor(tenants, scope);
      out.numberOfCtSplits = tenants * 3;
      // Silbo gateway count is a fixed appliance — always one per site.
      out.numberOfSilboGateways = 1;
      // One SIM card is always provisioned for the Silbo gateway uplink.
      out.numberOfSims = 1;
    } else if (scope === RmsScope.RMS_SERVICE) {
      out.numberOfTenants = input.numberOfTenants ?? 0;
    } else if (scope === RmsScope.SIM_SWAP) {
      out.numberOfSims = input.numberOfSims ?? 0;
      // add number of tenants if provided, otherwise default to 0
      // has smart meter
      out.hasSmartMeter = !!input.hasSmartMeter;
      if (out.hasSmartMeter) {
        const tenants = input.numberOfTenants ?? 0;
        out.numberOfTenants = tenants;
        out.numberOfSmartMeters = SiteService.smartMetersFor(tenants, scope);
        out.numberOfCtSplits = tenants * 3;
        // RMS scope intentionally excludes silbo gateways.
      }
    } else if (scope === RmsScope.CCTV) {
      out.numberOfCameras = input.numberOfCameras ?? 0;
      out.numberOfHardDisks = input.numberOfHardDisks ?? 0;
      out.numberOfNvr = input.numberOfNvr ?? 0;
    } else if (scope === RmsScope.LEGACY_POO_METER) {
      out.hasSmartMeter = true;
      const tenants = input.numberOfTenants ?? 0;
      out.numberOfTenants = tenants;
      out.numberOfSmartMeters = SiteService.smartMetersFor(tenants, scope);
      out.numberOfCtSplits = tenants * 3;
      out.numberOfSilboGateways = 0;
      out.numberOfSims = 0;
    } else if (scope === RmsScope.COLLOCATION_METER) {
      out.hasSmartMeter = true;
      const tenants = input.numberOfTenants ?? 0;
      out.numberOfTenants = tenants;
      out.numberOfSmartMeters = SiteService.smartMetersFor(tenants, scope);
      out.numberOfCtSplits = tenants * 3;
      out.hasSmartLock = true;
      out.numberOfFenceLocks = input.numberOfFenceLocks ?? 0;
      out.numberOfOdus = input.numberOfOdus ?? 0;
      out.numberOfSilboGateways = 0;
      out.numberOfSims = 0;
    }

    return out;
  }

  // ──────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────

  async create(dto: CreateSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can create sites');
    }
    const exists = await this.siteModel.findOne({ tawalId: dto.tawalId });
    if (exists) throw new BadRequestException('tawalId already exists');

    const counts = this.deriveCounts(dto);
    const doc = new this.siteModel({
      ...dto,
      ...counts,
      createdBy: new Types.ObjectId(actor.userId),
      status: { created: { done: true, at: new Date() } },
    });
    await doc.save();
    return this.serialize(doc);
  }

  // Best-effort batched create. Each row is attempted independently so a
  // single bad row doesn't poison the whole import — successes and failures
  // are returned together for the UI to summarize.
  async bulkCreate(
    dtos: CreateSiteDto[],
    actor: CurrentUserPayload,
  ): Promise<{
    created: number;
    failed: Array<{ row: number; reason: string }>;
  }> {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can import sites');
    }
    let created = 0;
    const failed: Array<{ row: number; reason: string }> = [];
    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];
      try {
        const exists = await this.siteModel.findOne({ tawalId: dto.tawalId });
        if (exists) throw new Error(`tawalId ${dto.tawalId} already exists`);
        const counts = this.deriveCounts(dto);
        const doc = new this.siteModel({
          ...dto,
          ...counts,
          createdBy: new Types.ObjectId(actor.userId),
          status: { created: { done: true, at: new Date() } },
        });
        await doc.save();
        created++;
      } catch (err: any) {
        failed.push({ row: i + 1, reason: err?.message ?? 'Unknown error' });
      }
    }
    return { created, failed };
  }

  async list(query: ListSitesQueryDto, actor: CurrentUserPayload) {
    const filter: FilterQuery<SiteDocument> = {};

    if (actor.role === Role.TECHNICIAN) {
      filter['status.assigned.assignedTo'] = new Types.ObjectId(actor.userId);
    }

    if (query.region) filter.region = query.region;
    if (query.siteCity) filter.siteCity = query.siteCity;
    if (query.rmsScope) filter.rmsScope = query.rmsScope;
    if (query.simSwapSerial) {
      const needle = query.simSwapSerial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['simSwapPairs'] = {
        $elemMatch: {
          $or: [
            { newSerialNumber: { $regex: needle, $options: 'i' } },
            { oldSerialNumber: { $regex: needle, $options: 'i' } },
          ],
        },
      };
    }

    if (query.status) {
      // Filter by the latest milestone reached.
      switch (query.status) {
        case SiteStatusFilter.CREATED:
          filter['status.assigned.done'] = false;
          break;
        case SiteStatusFilter.ASSIGNED:
          filter['status.assigned.done'] = true;
          filter['status.processing.done'] = false;
          break;
        case SiteStatusFilter.PROCESSING:
          filter['status.processing.done'] = true;
          filter['status.completed.done'] = false;
          break;
        case SiteStatusFilter.COMPLETED:
          filter['status.completed.done'] = true;
          filter['status.reviewed.done'] = false;
          break;
        case SiteStatusFilter.REVIEWED:
          filter['status.reviewed.done'] = true;
          break;
      }
    }

    if (query.from || query.to) {
      filter.createdAt = {} as any;
      if (query.from) (filter.createdAt as any).$gte = new Date(query.from);
      if (query.to) (filter.createdAt as any).$lte = new Date(query.to);
    }

    if (query.search) {
      const rx = new RegExp(
        query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { siteName: rx },
        { tawalId: rx },
        { siteCity: rx },
        { tcnNumber: rx },
      ];
    }

    // Return all site fields EXCEPT heavy base64 image data.
    const projection = {
      'rmsUnits.serialImage': 0,
      'rmsUnits.tagImage': 0,
      'expanderUnits.serialImage': 0,
      'expanderUnits.tagImage': 0,
      'simCards.serialImage': 0,
      'simCards.tagImage': 0,
      'fenceLockUnits.serialImage': 0,
      'fenceLockUnits.tagImage': 0,
      'oduUnits.serialImage': 0,
      'oduUnits.tagImage': 0,
      'smartMeterUnits.serialImage': 0,
      'smartMeterUnits.tagImage': 0,
      'ctSplitUnits.serialImage': 0,
      'ctSplitUnits.tagImage': 0,
      'silboGatewayUnits.serialImage': 0,
      'silboGatewayUnits.tagImage': 0,
      'cctvCameraUnits.serialImage': 0,
      'cctvCameraUnits.tagImage': 0,
      'hardDiskUnits.serialImage': 0,
      'hardDiskUnits.tagImage': 0,
      'nvrUnits.serialImage': 0,
      'nvrUnits.tagImage': 0,
      'simSwapPairs.newSerialImage': 0,
      'simSwapPairs.oldSerialImage': 0,
      simSwapCtMainPhoto: 0,
      simSwapMeterPhoto: 0,
      'simSwapTenants.meterPhoto': 0,
      'simSwapTenants.ctPhasePhotos': 0,
      cctvNvrPhoto: 0,
      cctvNvrMainBoxPhoto: 0,
      cctvCameraPhoto: 0,
      cctvHardDiskPhoto: 0,
      cctvCameraPhotos: 0,
      cctvHardDiskPhotos: 0,
      cctvFullSitePhoto: 0,
      otherSitePhotos: 0,
    };

    // When pagination params are explicitly provided, return paginated response.
    // Otherwise return the full array for backward compatibility (mobile app). i was woking before
    const hasPagination = query.page !== undefined || query.limit !== undefined;

    let docs: any[];
    let total: number;
    let page = 1;
    let limit = 20;

    const countQuery =
      Object.keys(filter).length === 0
        ? this.siteModel.estimatedDocumentCount()
        : this.siteModel.countDocuments(filter);

    const isAll = query.limit === 0;

    if (hasPagination) {
      if (isAll) {
        [docs, total] = await Promise.all([
          this.siteModel
            .find(filter, projection)
            .sort({ createdAt: -1 })
            .lean(),
          countQuery,
        ]);
        page = 1;
        limit = total;
      } else {
        page = Math.max(1, query.page ?? 1);
        limit = Math.max(1, query.limit ?? 20);
        const skip = (page - 1) * limit;
        [docs, total] = await Promise.all([
          this.siteModel
            .find(filter, projection)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          countQuery,
        ]);
      }
    } else {
      [docs, total] = await Promise.all([
        this.siteModel.find(filter, projection).sort({ createdAt: -1 }).lean(),
        countQuery,
      ]);
    }

    const sanitized = docs.map((d) => this.serialize(d));

    if (!hasPagination) {
      return sanitized;
    }

    return {
      data: sanitized,
      total,
      page,
      limit,
      totalPages: isAll ? 1 : Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string, actor: CurrentUserPayload) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site id');
    }
    const doc = await this.siteModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Site not found');

    if (actor.role === Role.TECHNICIAN) {
      const assignedTo = doc.status?.assigned?.assignedTo;
      if (!assignedTo || String(assignedTo) !== actor.userId) {
        throw new ForbiddenException('Not assigned to this site');
      }
    }
    return this.serialize(doc);
  }

  async update(id: string, dto: UpdateSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can edit site info / counts');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');

    // If the scope is changing (or counts changing), re-derive consistent counts.
    const merged: any = { ...doc.toObject(), ...dto };
    const counts = this.deriveCounts(merged);

    Object.assign(doc, dto, counts);
    await doc.save();
    return this.serialize(doc);
  }

  async remove(id: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete sites');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    await doc.deleteOne();
    return { deleted: true };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Status transitions
  // ──────────────────────────────────────────────────────────────────────

  async assign(id: string, technicianId: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.MANAGER && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only managers/admins can assign');
    }
    if (!Types.ObjectId.isValid(technicianId)) {
      throw new BadRequestException('Invalid technicianId');
    }
    const technician = await this.userModel.findById(technicianId);
    if (!technician) throw new NotFoundException('Technician not found');
    if (technician.role !== 'technician') {
      throw new BadRequestException('Selected user is not a technician');
    }

    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');

    doc.status.assigned = {
      done: true,
      at: new Date(),
      assignedTo: new Types.ObjectId(technicianId),
      assignedBy: new Types.ObjectId(actor.userId),
    } as any;
    // Re-assigning a previously-completed site resets later milestones so the
    // newly-assigned technician starts from "processing".
    doc.status.processing = { done: false } as any;
    doc.status.completed = { done: false } as any;
    doc.status.reviewed = { done: false } as any;
    await doc.save();
    return this.serialize(doc);
  }

  async accept(id: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can accept sites');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    const assignedTo = doc.status?.assigned?.assignedTo;
    if (!assignedTo || String(assignedTo) !== actor.userId) {
      throw new ForbiddenException('Site is not assigned to you');
    }
    doc.status.processing = { done: true, at: new Date() } as any;
    await doc.save();
    return this.serialize(doc);
  }

  // Save partial unit data without flipping the completed milestone.
  async saveDraft(id: string, dto: SubmitSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can save drafts');
    }
    const doc = await this.assertTechnicianCanWrite(id, actor);
    this.applyUnitArrays(doc, dto);
    await doc.save();
    return this.serialize(doc);
  }

  async submit(id: string, dto: SubmitSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can submit sites');
    }
    const doc = await this.assertTechnicianCanWrite(id, actor);
    this.applyUnitArrays(doc, dto);
    doc.status.completed = { done: true, at: new Date() } as any;
    await doc.save();
    return this.serialize(doc);
  }

  async review(id: string, actor: CurrentUserPayload, remarks?: string) {
    if (actor.role !== Role.MANAGER && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only managers/admins can review');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    if (!doc.status.completed.done) {
      throw new BadRequestException('Site is not completed yet');
    }
    doc.status.reviewed = {
      done: true,
      at: new Date(),
      reviewedBy: new Types.ObjectId(actor.userId),
      remarks: (remarks ?? '').trim(),
    } as any;
    await doc.save();
    return this.serialize(doc);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────

  private async assertTechnicianCanWrite(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<SiteDocument> {
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    const assignedTo = doc.status?.assigned?.assignedTo;
    if (!assignedTo || String(assignedTo) !== actor.userId) {
      throw new ForbiddenException('Site is not assigned to you');
    }
    if (!doc.status.processing.done) {
      throw new BadRequestException(
        'Accept the site before submitting field data',
      );
    }
    return doc;
  }

  private applyUnitArrays(doc: SiteDocument, dto: SubmitSiteDto) {
    const keys: Array<keyof SubmitSiteDto> = [
      'rmsUnits',
      'expanderUnits',
      'simCards',
      'fenceLockUnits',
      'oduUnits',
      'smartMeterUnits',
      'ctSplitUnits',
      'silboGatewayUnits',
      'cctvCameraUnits',
      'hardDiskUnits',
      'nvrUnits',
      'simSwapComments',
      'simSwapPairs',
      'simSwapSiteType',
      'simSwapLatitude',
      'simSwapLongitude',
      'simSwapTenants',
      'simSwapCtMainPhoto',
      'simSwapMeterPhoto',
      'cctvNvrPhoto',
      'cctvNvrMainBoxPhoto',
      'cctvCameraPhoto',
      'cctvHardDiskPhoto',
      'cctvCameraPhotos',
      'cctvHardDiskPhotos',
      'cctvFullSitePhoto',
      'otherSitePhotos',
      'numberOfRms',
      'numberOfExpanders',
      'numberOfSims',
      'numberOfFenceLocks',
      'numberOfShelterLocks',
      'numberOfOdus',
      'numberOfSmartMeters',
      'numberOfCtSplits',
      'numberOfSilboGateways',
    ];
    for (const k of keys) {
      if (dto[k] !== undefined) (doc as any)[k] = dto[k];
    }
    // Synchronize array and legacy single photo fields for CCTV
    if (
      dto.cctvCameraPhotos &&
      Array.isArray(dto.cctvCameraPhotos) &&
      dto.cctvCameraPhotos.length > 0
    ) {
      (doc as any).cctvCameraPhoto = dto.cctvCameraPhotos[0] || '';
    } else if (dto.cctvCameraPhoto && !dto.cctvCameraPhotos) {
      (doc as any).cctvCameraPhotos = [dto.cctvCameraPhoto];
    }
    if (
      dto.cctvHardDiskPhotos &&
      Array.isArray(dto.cctvHardDiskPhotos) &&
      dto.cctvHardDiskPhotos.length > 0
    ) {
      (doc as any).cctvHardDiskPhoto = dto.cctvHardDiskPhotos[0] || '';
    } else if (dto.cctvHardDiskPhoto && !dto.cctvHardDiskPhotos) {
      (doc as any).cctvHardDiskPhotos = [dto.cctvHardDiskPhoto];
    }
    // Handle nested materials object - store ONLY as a nested sub-document
    // (separate from admin-set top-level counts)
    if (dto.materials !== undefined) {
      (doc as any).materials = dto.materials;
    }
  }

  // Normalize ObjectIds and timestamps so the client gets stable shapes.
  serialize(doc: any) {
    const obj: any =
      typeof doc?.toObject === 'function'
        ? doc.toObject({ versionKey: false })
        : { ...doc };
    delete obj.__v;
    if (obj._id) obj._id = String(obj._id);
    if (obj.createdBy) obj.createdBy = String(obj.createdBy);
    if (obj.status?.assigned?.assignedTo) {
      obj.status.assigned.assignedTo = String(obj.status.assigned.assignedTo);
    }
    if (obj.status?.assigned?.assignedBy) {
      obj.status.assigned.assignedBy = String(obj.status.assigned.assignedBy);
    }
    if (obj.status?.reviewed?.reviewedBy) {
      obj.status.reviewed.reviewedBy = String(obj.status.reviewed.reviewedBy);
    }
    return obj;
  }

  // Public endpoint helper: returns concise sites details with non-empty tagsByItemCode and serialsByItemCode.
  async getSitesTags() {
    const sites = await this.siteModel.find().lean().exec();

    const unitGroupSpecs = [
      { key: 'rmsUnits', itemCode: 'Smart-TWR-001' },
      { key: 'expanderUnits', itemCode: 'Smart-TWR-007' },
      { key: 'fenceLockUnits', itemCode: 'Smart-TWR-0025' },
      { key: 'oduUnits', itemCode: 'Smart-TWR-0027' },
      { key: 'smartMeterUnits', itemCode: 'Smart-TWR-0023' },
      { key: 'cctvCameraUnits', itemCode: 'CCTV-001' },
      { key: 'hardDiskUnits', itemCode: 'CCTV-006' },
      { key: 'nvrUnits', itemCode: 'CCTV-002' },
    ];

    return sites.map((site: any) => {
      const tagsByItemCode: Record<string, string[]> = {};
      const serialsByItemCode: Record<string, string[]> = {};

      for (const spec of unitGroupSpecs) {
        const rawUnits = site[spec.key];
        const tags: string[] = [];
        const serials: string[] = [];

        if (Array.isArray(rawUnits)) {
          for (const item of rawUnits) {
            const serial = item?.serialNumber?.trim() || '';
            const tag = item?.tagNumber?.trim() || '';

            if (tag) {
              tags.push(tag);
            }
            if (serial) {
              serials.push(serial);
            }
          }
        }

        if (tags.length > 0) {
          tagsByItemCode[spec.itemCode] = tags;
        }
        if (serials.length > 0) {
          serialsByItemCode[spec.itemCode] = serials;
        }
      }

      return {
        id: site._id ? site._id.toString() : '',
        siteName: site.siteName || '',
        tagsByItemCode,
        serialsByItemCode,
      };
    });
  }
}
