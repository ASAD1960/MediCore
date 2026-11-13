import { AppError, NotFound } from '../../shared/errors/AppError';
import { patientRepository as repo } from './patient.repository';
import { CreatePatientDto, ListPatientsQuery, UpdatePatientDto } from './patient.types';

export const patientService = {
  list: (orgId: string, q: ListPatientsQuery) => repo.list(orgId, q),

  async get(orgId: string, id: string) {
    const p = await repo.findById(orgId, id);
    if (!p) throw NotFound('Patient');
    return p;
  },

  async register(orgId: string, dto: CreatePatientDto) {
    const { confirmDuplicate, ...data } = dto;
    if (!confirmDuplicate) {
      const dupes = await repo.findPotentialDuplicates(orgId, dto);
      if (dupes.length) {
        // FR-PAT-12: potential duplicates require explicit review (UC-01 alt flow).
        throw new AppError(409, 'Potential duplicate patient(s) found. Review and resubmit with confirmDuplicate=true.',
          dupes.map((d) => ({ field: 'duplicate', message: `${d.patientNumber} ${d.firstName} ${d.lastName}` })));
      }
    }
    return repo.createWithNumber(orgId, data);
  },

  async update(orgId: string, id: string, dto: UpdatePatientDto) {
    const p = await repo.update(orgId, id, dto);
    if (!p) throw NotFound('Patient');
    return p;
  },
};
