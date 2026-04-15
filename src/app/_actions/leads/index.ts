/**
 * Barrel export para ações de leads.
 * Mantém compatibilidade com imports existentes: import { createLead } from '@/app/_actions/leads'
 */
export { getPipelineData } from './get-pipeline'
export { createLead } from './create-lead'
export { updateLeadStage, updateLead } from './update-lead'
export { deleteLead, archiveLead } from './delete-lead'
export {
    getNextBrokerForDistribution,
    getLeadSources,
    createLeadSource,
    getLeadCampaigns,
    createLeadCampaign
} from './distribution'
