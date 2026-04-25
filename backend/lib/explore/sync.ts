import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';

interface DomainData {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
  icon?: string;
  order: number;
}

interface LayerData {
  key: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
}

interface NodeData {
  slug: string;
  title: string;
  summary: string;
  description: string;
  tags?: string[];
  layerKey: string;
  domainSlug: string;
}

interface WorkData {
  slug: string;
  nodeSlug: string;
  title: string;
  type: string;
  year: number;
  authors: string;
  venueOrOrg: string;
  summary: string;
  whyMilestone: string;
  tags?: string[];
  url: string;
  thumbnail?: string;
}

interface DomainsJSON {
  domains: DomainData[];
}

interface NodesJSON {
  nodes: NodeData[];
  layers: LayerData[];
}

interface WorksJSON {
  works: WorkData[];
}

export interface SyncStats {
  domainsCreated: number;
  domainsUpdated: number;
  layersCreated: number;
  nodesCreated: number;
  nodesUpdated: number;
  worksCreated: number;
  conflicts: number;
}

function detectDomainChanges(existing: any, fileData: DomainData): boolean {
  return (
    existing.name !== fileData.name ||
    existing.description !== fileData.description ||
    existing.shortName !== fileData.shortName ||
    existing.accentColor !== fileData.accentColor ||
    existing.order !== fileData.order
  );
}

function detectNodeChanges(existing: any, fileData: NodeData): boolean {
  return (
    existing.title !== fileData.title ||
    existing.summary !== fileData.summary ||
    existing.description !== fileData.description ||
    JSON.stringify(existing.tags) !== JSON.stringify(fileData.tags)
  );
}

function detectWorkChanges(existing: any, fileData: WorkData): boolean {
  return (
    existing.title !== fileData.title ||
    existing.summary !== fileData.summary ||
    existing.whyMilestone !== fileData.whyMilestone
  );
}

export async function syncExploreData(options: { force?: boolean } = {}): Promise<SyncStats> {
  const stats: SyncStats = {
    domainsCreated: 0,
    domainsUpdated: 0,
    layersCreated: 0,
    nodesCreated: 0,
    nodesUpdated: 0,
    worksCreated: 0,
    conflicts: 0,
  };

  try {
    // 读取数据文件
    const domainsPath = path.join(process.cwd(), 'data', 'explore', 'domains.json');
    const nodesPath = path.join(process.cwd(), 'data', 'explore', 'research-nodes.json');
    const worksPath = path.join(process.cwd(), 'data', 'explore', 'works.json');

    if (!fs.existsSync(domainsPath)) {
      throw new Error(`Domains file not found: ${domainsPath}`);
    }
    if (!fs.existsSync(nodesPath)) {
      throw new Error(`Nodes file not found: ${nodesPath}`);
    }
    if (!fs.existsSync(worksPath)) {
      throw new Error(`Works file not found: ${worksPath}`);
    }

    const domainsData: DomainsJSON = JSON.parse(fs.readFileSync(domainsPath, 'utf-8'));
    const nodesData: NodesJSON = JSON.parse(fs.readFileSync(nodesPath, 'utf-8'));
    const worksData: WorksJSON = JSON.parse(fs.readFileSync(worksPath, 'utf-8'));

    // 1. 同步研究层 (先同步层，因为节点依赖层)
    for (const layer of nodesData.layers) {
      await db.aIResearchLayer.upsert({
        where: { key: layer.key },
        update: layer,
        create: layer,
      });
      stats.layersCreated++;
    }

    // 2. 同步领域
    for (const domain of domainsData.domains) {
      const existing = await db.aIDomain.findUnique({
        where: { slug: domain.slug },
      });

      if (existing && !options.force) {
        const hasChanges = detectDomainChanges(existing, domain);
        if (hasChanges) {
          stats.conflicts++;
          console.warn(`Conflict detected for domain ${domain.slug}, skipping. Use force=true to overwrite.`);
          continue;
        }
      }

      await db.aIDomain.upsert({
        where: { slug: domain.slug },
        update: options.force ? domain : {},
        create: domain,
      });

      if (existing) {
        stats.domainsUpdated++;
      } else {
        stats.domainsCreated++;
      }
    }

    // 3. 同步研究节点
    for (const node of nodesData.nodes) {
      // 检查domain是否存在
      const domain = await db.aIDomain.findUnique({
        where: { slug: node.domainSlug },
      });
      if (!domain) {
        console.warn(`Domain ${node.domainSlug} not found for node ${node.slug}, skipping.`);
        continue;
      }

      const existing = await db.aIResearchNode.findUnique({
        where: {
          domainSlug_slug: {
            domainSlug: node.domainSlug,
            slug: node.slug,
          },
        },
      });

      if (existing && !options.force) {
        const hasChanges = detectNodeChanges(existing, node);
        if (hasChanges) {
          stats.conflicts++;
          console.warn(`Conflict detected for node ${node.slug}, skipping. Use force=true to overwrite.`);
          continue;
        }
      }

      await db.aIResearchNode.upsert({
        where: {
          domainSlug_slug: {
            domainSlug: node.domainSlug,
            slug: node.slug,
          },
        },
        update: options.force ? node : {},
        create: node,
      });

      if (existing) {
        stats.nodesUpdated++;
      } else {
        stats.nodesCreated++;
      }
    }

    // 4. 同步代表工作
    for (const work of worksData.works) {
      // 查找对应的node ID
      const node = await db.aIResearchNode.findFirst({
        where: {
          slug: work.nodeSlug,
        },
      });

      if (!node) {
        console.warn(`Node ${work.nodeSlug} not found for work ${work.slug}, skipping.`);
        continue;
      }

      const existing = await db.aIWork.findUnique({
        where: { slug: work.slug },
      });

      if (existing && !options.force) {
        const hasChanges = detectWorkChanges(existing, work);
        if (hasChanges) {
          stats.conflicts++;
          console.warn(`Conflict detected for work ${work.slug}, skipping. Use force=true to overwrite.`);
          continue;
        }
      }

      await db.aIWork.upsert({
        where: { slug: work.slug },
        update: options.force ? {
          title: work.title,
          type: work.type,
          year: work.year,
          authors: work.authors,
          venueOrOrg: work.venueOrOrg,
          summary: work.summary,
          whyMilestone: work.whyMilestone,
          tags: work.tags,
          url: work.url,
          thumbnail: work.thumbnail,
        } : {},
        create: {
          slug: work.slug,
          nodeId: node.id,
          title: work.title,
          type: work.type,
          year: work.year,
          authors: work.authors,
          venueOrOrg: work.venueOrOrg,
          summary: work.summary,
          whyMilestone: work.whyMilestone,
          tags: work.tags,
          url: work.url,
          thumbnail: work.thumbnail,
        },
      });

      if (!existing) {
        stats.worksCreated++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error syncing explore data:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const force = process.argv.includes('--force');
  syncExploreData({ force })
    .then((stats) => {
      console.log('Sync completed:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}
