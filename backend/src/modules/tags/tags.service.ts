import { NotFoundError } from '../../shared/errors.js';
import { normalizeDescription } from '../../shared/text.js';
import { TagAlreadyExistsError } from './tags.errors.js';
import type { TagRecord, TagsRepository } from './tags.repository.js';

export class TagsService {
  constructor(private readonly repository: TagsRepository) {}

  // Sem paginação: uma pessoa tem dezenas de etiquetas (docs/03-arquitetura.md).
  list(): Promise<TagRecord[]> {
    return this.repository.findAll();
  }

  async create(name: string): Promise<TagRecord> {
    await this.assertNameAvailable(name);
    const tagId = await this.repository.insert(name, normalizeDescription(name));
    return this.get(tagId);
  }

  async rename(tagId: string, name: string): Promise<TagRecord> {
    await this.get(tagId);
    await this.assertNameAvailable(name, tagId);
    await this.repository.rename(tagId, name, normalizeDescription(name));
    return this.get(tagId);
  }

  async remove(tagId: string): Promise<void> {
    const wasDeleted = await this.repository.delete(tagId);
    if (!wasDeleted) throw new NotFoundError(`Etiqueta ${tagId} não existe`);
  }

  private async get(tagId: string): Promise<TagRecord> {
    const tag = await this.repository.findById(tagId);
    if (!tag) throw new NotFoundError(`Etiqueta ${tagId} não existe`);
    return tag;
  }

  private async assertNameAvailable(name: string, exceptTagId?: string): Promise<void> {
    if (await this.repository.existsWithNormalizedName(normalizeDescription(name), exceptTagId)) {
      throw new TagAlreadyExistsError(`Já existe uma etiqueta chamada "${name}"`, {
        details: [{ field: 'name', message: 'Já existe uma etiqueta com este nome' }],
      });
    }
  }
}
