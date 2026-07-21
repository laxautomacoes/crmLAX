/**
 * Barrel export para ações de leads.
 * Mantém compatibilidade com imports existentes: import { createLead } from '@/app/_actions/leads'
 */
export { getPipelineData, getSimpleLeads } from './get-pipeline'
export { getLeadDetails } from './get-lead'
export { createLead } from './create-lead'
export { updateLeadStage, updateLead } from './update-lead'
export { deleteLead, archiveLead } from './delete-lead'
export {
    getNextBrokerForDistribution,
    getLeadSources,
    createLeadSource,
    updateLeadSource,
    deleteLeadSource,
    getLeadCampaigns,
    createLeadCampaign,
    updateLeadCampaign,
    deleteLeadCampaign
} from './distribution'
export { createLeadsBulk } from './bulk-import'
export { syncContactAvatar, syncAllContactAvatars } from './sync-avatars'

