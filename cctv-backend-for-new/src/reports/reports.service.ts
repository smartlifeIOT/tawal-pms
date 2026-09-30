import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { Site, SiteDocument } from '../site/site.schema';
import { SiteStatusFilter } from '../site/dto/list-sites-query.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(@InjectModel(Site.name) private siteModel: Model<SiteDocument>) {}

  private buildFilter(q: ReportQueryDto): FilterQuery<SiteDocument> {
    const filter: FilterQuery<SiteDocument> = {};
    if (q.region) filter.region = q.region;
    if (q.rmsScope) filter.rmsScope = q.rmsScope;
    if (q.status) {
      switch (q.status) {
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
    if (q.from || q.to) {
      filter.createdAt = {} as any;
      if (q.from) (filter.createdAt as any).$gte = new Date(q.from);
      if (q.to) (filter.createdAt as any).$lte = new Date(q.to);
    }
    return filter;
  }

  async listSites(q: ReportQueryDto) {
    const filter = this.buildFilter(q);

    // When pagination params are explicitly provided, return a paginated
    // response. Otherwise return the full array for backward compatibility
    // (the Excel export relies on the full list).
    const hasPagination = q.page !== undefined || q.limit !== undefined;

    let docs: any[];
    let total: number;
    let page = 1;
    let limit = 20;

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

    const isAll = q.limit === 0;

    if (hasPagination) {
      if (isAll) {
        [docs, total] = await Promise.all([
          this.siteModel
            .find(filter, projection)
            .sort({ createdAt: -1 }),
          this.siteModel.countDocuments(filter),
        ]);
        page = 1;
        limit = total;
      } else {
        page = Math.max(1, q.page ?? 1);
        limit = Math.max(1, q.limit ?? 20);
        const skip = (page - 1) * limit;
        [docs, total] = await Promise.all([
          this.siteModel
            .find(filter, projection)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          this.siteModel.countDocuments(filter),
        ]);
      }
    } else {
      docs = await this.siteModel
        .find(filter, projection)
        .sort({ createdAt: -1 });
      total = docs.length;
    }

    const sanitized = docs.map((d) => {
      const o: any = d.toObject({ versionKey: false });
      o._id = String(o._id);
      return o;
    });

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

  private joinUnitField(
    units: Array<{ serialNumber?: string; tagNumber?: string }>,
    field: 'serialNumber' | 'tagNumber',
  ) {
    return units
      .map((unit) => unit[field]?.toString().trim())
      .filter(Boolean)
      .join('\n');
  }

  private joinSimSwapPairs(
    pairs: any[],
    field: 'newSerialNumber' | 'oldSerialNumber',
  ) {
    return (pairs || [])
      .map((p) => p[field]?.toString().trim())
      .filter(Boolean)
      .join('\n');
  }

  private joinTenants(tenants: any[]) {
    return (tenants || [])
      .map((t) => t.tenantName?.toString().trim())
      .filter(Boolean)
      .join('\n');
  }

  private joinTenantCapacities(tenants: any[]) {
    return (tenants || [])
      .map((t) => {
        const caps = t.tenantCtCapacities || [];
        const p1 = caps[0] || '-';
        const p2 = caps[1] || '-';
        const p3 = caps[2] || '-';
        return `${t.tenantName || 'Tenant'}: P1(${p1}), P2(${p2}), P3(${p3})`;
      })
      .join('\n');
  }

  // Build an Excel workbook with one row per site (units summarized as counts;
  // detailed unit serial/tag data is exported in dedicated columns).
  async buildExcel(q: ReportQueryDto): Promise<Buffer> {
    // The Excel export always needs the full dataset, so strip any pagination
    // params before fetching.
    const exportQuery: ReportQueryDto = { ...q };
    delete exportQuery.page;
    delete exportQuery.limit;
    const result = await this.listSites(exportQuery);
    const sites = Array.isArray(result) ? result : result.data;

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Sites');

    sheet.columns = [
      { header: 'Site Name', key: 'siteName', width: 24 },
      { header: 'Tawal ID', key: 'tawalId', width: 16 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'City', key: 'siteCity', width: 16 },
      { header: 'TCN', key: 'tcnNumber', width: 14 },
      { header: 'Scope', key: 'rmsScope', width: 14 },
      { header: '# RMS', key: 'numberOfRms', width: 8 },
      { header: 'RMS Serials', key: 'rmsSerials', width: 30 },
      { header: 'RMS Tags', key: 'rmsTags', width: 30 },
      { header: '# Expanders', key: 'numberOfExpanders', width: 11 },
      { header: 'Expander Serials', key: 'expanderSerials', width: 30 },
      { header: 'Expander Tags', key: 'expanderTags', width: 30 },
      { header: '# SIMs', key: 'numberOfSims', width: 8 },
      { header: 'SIM Serials', key: 'simCardSerials', width: 30 },
      { header: 'SIM Tags', key: 'simCardTags', width: 30 },
      { header: 'Smart Lock', key: 'hasSmartLock', width: 11 },
      { header: '# Fence Locks', key: 'numberOfFenceLocks', width: 13 },
      { header: '# Shelter Locks', key: 'numberOfShelterLocks', width: 15 },
      { header: 'Fence Lock Serials', key: 'fenceLockSerials', width: 30 },
      { header: 'Fence Lock Tags', key: 'fenceLockTags', width: 30 },
      { header: '# ODUs', key: 'numberOfOdus', width: 9 },
      { header: 'ODU Serials', key: 'oduSerials', width: 30 },
      { header: 'ODU Tags', key: 'oduTags', width: 30 },
      { header: 'Smart Meter', key: 'hasSmartMeter', width: 12 },
      { header: '# Tenants', key: 'numberOfTenants', width: 10 },
      { header: '# Smart Meters', key: 'numberOfSmartMeters', width: 13 },
      { header: 'Smart Meter Serials', key: 'smartMeterSerials', width: 30 },
      { header: 'Smart Meter Tags', key: 'smartMeterTags', width: 30 },
      { header: '# CT Splits', key: 'numberOfCtSplits', width: 11 },
      { header: 'CT Split Serials', key: 'ctSplitSerials', width: 30 },
      { header: 'CT Split Tags', key: 'ctSplitTags', width: 30 },
      { header: '# Silbo GW', key: 'numberOfSilboGateways', width: 11 },
      { header: 'Silbo GW Serials', key: 'silboGatewaySerials', width: 30 },
      { header: 'Silbo GW Tags', key: 'silboGatewayTags', width: 30 },
      // ── CCTV Scope Specific Columns ──
      { header: '# Cameras', key: 'numberOfCameras', width: 10 },
      { header: 'Camera Serials', key: 'cameraSerials', width: 30 },
      { header: 'Camera Tags', key: 'cameraTags', width: 30 },
      { header: '# Hard Disks', key: 'numberOfHardDisks', width: 12 },
      { header: 'Hard Disk Serials', key: 'hardDiskSerials', width: 30 },
      { header: 'Hard Disk Tags', key: 'hardDiskTags', width: 30 },
      { header: '# NVR', key: 'numberOfNvr', width: 9 },
      { header: 'NVR Serials', key: 'nvrSerials', width: 30 },
      { header: 'NVR Tags', key: 'nvrTags', width: 30 },
      // ── SIM Swap Scope Specific Columns ──
      { header: 'SIM Swap New Serials', key: 'simSwapNewSerials', width: 30 },
      { header: 'SIM Swap Old Serials', key: 'simSwapOldSerials', width: 30 },
      { header: 'SIM Swap Site Type', key: 'simSwapSiteType', width: 18 },
      { header: 'SIM Swap Lat', key: 'simSwapLatitude', width: 12 },
      { header: 'SIM Swap Lng', key: 'simSwapLongitude', width: 12 },
      { header: 'SIM Swap Comments', key: 'simSwapComments', width: 30 },
      { header: 'Tenant Names', key: 'tenantNames', width: 24 },
      { header: 'Tenant CT Capacities', key: 'tenantCtCapacities', width: 35 },
      // ── Status ──
      { header: 'Created', key: '_created', width: 10 },
      { header: 'Assigned', key: '_assigned', width: 10 },
      { header: 'Processing', key: '_processing', width: 11 },
      { header: 'Completed', key: '_completed', width: 11 },
      { header: 'Reviewed', key: '_reviewed', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => {
      if (typeof col.width === 'number') {
        col.alignment = { wrapText: true, vertical: 'top' };
      }
    });

    for (const s of sites) {
      const isSimSwap = s.rmsScope === 'SIM_SWAP';
      sheet.addRow({
        ...s,
        hasSmartLock: s.hasSmartLock ? 'Yes' : 'No',
        hasSmartMeter: s.hasSmartMeter ? 'Yes' : 'No',
        rmsSerials: this.joinUnitField(s.rmsUnits || [], 'serialNumber'),
        rmsTags: this.joinUnitField(s.rmsUnits || [], 'tagNumber'),
        expanderSerials: this.joinUnitField(
          s.expanderUnits || [],
          'serialNumber',
        ),
        expanderTags: this.joinUnitField(s.expanderUnits || [], 'tagNumber'),
        simCardSerials: isSimSwap
          ? this.joinSimSwapPairs(s.simSwapPairs || [], 'newSerialNumber')
          : this.joinUnitField(s.simCards || [], 'serialNumber'),
        simCardTags: this.joinUnitField(s.simCards || [], 'tagNumber'),
        fenceLockSerials: this.joinUnitField(
          s.fenceLockUnits || [],
          'serialNumber',
        ),
        fenceLockTags: this.joinUnitField(s.fenceLockUnits || [], 'tagNumber'),
        oduSerials: this.joinUnitField(s.oduUnits || [], 'serialNumber'),
        oduTags: this.joinUnitField(s.oduUnits || [], 'tagNumber'),
        smartMeterSerials: this.joinUnitField(
          s.smartMeterUnits || [],
          'serialNumber',
        ),
        smartMeterTags: this.joinUnitField(
          s.smartMeterUnits || [],
          'tagNumber',
        ),
        ctSplitSerials: this.joinUnitField(
          s.ctSplitUnits || [],
          'serialNumber',
        ),
        ctSplitTags: this.joinUnitField(s.ctSplitUnits || [], 'tagNumber'),
        silboGatewaySerials: this.joinUnitField(
          s.silboGatewayUnits || [],
          'serialNumber',
        ),
        silboGatewayTags: this.joinUnitField(
          s.silboGatewayUnits || [],
          'tagNumber',
        ),
        // CCTV fields
        cameraSerials: this.joinUnitField(
          s.cctvCameraUnits || [],
          'serialNumber',
        ),
        cameraTags: this.joinUnitField(s.cctvCameraUnits || [], 'tagNumber'),
        hardDiskSerials: this.joinUnitField(
          s.hardDiskUnits || [],
          'serialNumber',
        ),
        hardDiskTags: this.joinUnitField(s.hardDiskUnits || [], 'tagNumber'),
        nvrSerials: this.joinUnitField(s.nvrUnits || [], 'serialNumber'),
        nvrTags: this.joinUnitField(s.nvrUnits || [], 'tagNumber'),
        // SIM Swap fields
        simSwapNewSerials: this.joinSimSwapPairs(
          s.simSwapPairs || [],
          'newSerialNumber',
        ),
        simSwapOldSerials: this.joinSimSwapPairs(
          s.simSwapPairs || [],
          'oldSerialNumber',
        ),
        simSwapSiteType: s.simSwapSiteType
          ? s.simSwapSiteType === 'green_field'
            ? 'Green Field'
            : 'Roof Top'
          : '',
        simSwapLatitude: s.simSwapLatitude ?? '',
        simSwapLongitude: s.simSwapLongitude ?? '',
        simSwapComments: s.simSwapComments ?? '',
        tenantNames: this.joinTenants(s.simSwapTenants || []),
        tenantCtCapacities: this.joinTenantCapacities(s.simSwapTenants || []),
        _created: s.status?.created?.done ? '✓' : '',
        _assigned: s.status?.assigned?.done ? '✓' : '',
        _processing: s.status?.processing?.done ? '✓' : '',
        _completed: s.status?.completed?.done ? '✓' : '',
        _reviewed: s.status?.reviewed?.done ? '✓' : '',
        createdAt: s.createdAt
          ? new Date(s.createdAt).toISOString().slice(0, 19).replace('T', ' ')
          : '',
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
