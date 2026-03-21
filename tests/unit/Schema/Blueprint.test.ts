import { Blueprint, ForeignKeyDefinition } from '../../../src/Schema/Blueprint';

describe('Schema / Blueprint', () => {
  let bp: Blueprint;

  beforeEach(() => {
    bp = new Blueprint('users');
  });

  describe('table metadata', () => {
    test('getTable returns table name', () => {
      expect(bp.getTable()).toBe('users');
    });

    test('starts with no columns or commands', () => {
      expect(bp.getColumns()).toEqual([]);
      expect(bp.getCommands()).toEqual([]);
    });
  });

  describe('primary key columns', () => {
    test('id() creates bigIncrements with auto-increment and primary', () => {
      const col = bp.id();
      expect(col.type).toBe('bigIncrements');
      expect(col.name).toBe('id');
      expect(col.autoIncrement).toBe(true);
      expect((col as any)._primary).toBe(true);
    });

    test('id() accepts custom name', () => {
      expect(bp.id('user_id').name).toBe('user_id');
    });

    test('increments()', () => {
      const col = bp.increments();
      expect(col.type).toBe('increments');
      expect(col.autoIncrement).toBe(true);
    });

    test('bigIncrements()', () => {
      const col = bp.bigIncrements('pk');
      expect(col.type).toBe('bigIncrements');
      expect(col.name).toBe('pk');
    });
  });

  describe('string columns', () => {
    test('string() with default length', () => {
      const col = bp.string('name');
      expect(col.type).toBe('string');
      expect(col.name).toBe('name');
      expect(col.length).toBe(255);
    });

    test('string() with custom length', () => {
      expect(bp.string('code', 10).length).toBe(10);
    });

    test('char()', () => {
      expect(bp.char('code', 3).type).toBe('char');
    });

    test('text()', () => {
      expect(bp.text('body').type).toBe('text');
    });

    test('mediumText()', () => {
      expect(bp.mediumText('content').type).toBe('mediumText');
    });

    test('longText()', () => {
      expect(bp.longText('essay').type).toBe('longText');
    });
  });

  describe('numeric columns', () => {
    test('integer()', () => {
      expect(bp.integer('age').type).toBe('integer');
    });

    test('bigInteger()', () => {
      expect(bp.bigInteger('views').type).toBe('bigInteger');
    });

    test('tinyInteger()', () => {
      expect(bp.tinyInteger('flag').type).toBe('tinyInteger');
    });

    test('smallInteger()', () => {
      expect(bp.smallInteger('rank').type).toBe('smallInteger');
    });

    test('mediumInteger()', () => {
      expect(bp.mediumInteger('count').type).toBe('mediumInteger');
    });

    test('unsignedInteger()', () => {
      const col = bp.unsignedInteger('qty');
      expect(col.type).toBe('integer');
      expect((col as any)._unsigned).toBe(true);
    });

    test('unsignedBigInteger()', () => {
      const col = bp.unsignedBigInteger('total');
      expect(col.type).toBe('bigInteger');
      expect((col as any)._unsigned).toBe(true);
    });

    test('float()', () => {
      const col = bp.float('price');
      expect(col.type).toBe('float');
      expect(col.precision).toBe(8);
      expect(col.scale).toBe(2);
    });

    test('double()', () => {
      const col = bp.double('lat', 10, 6);
      expect(col.precision).toBe(10);
      expect(col.scale).toBe(6);
    });

    test('decimal()', () => {
      const col = bp.decimal('amount', 12, 4);
      expect(col.type).toBe('decimal');
      expect(col.precision).toBe(12);
    });

    test('boolean()', () => {
      expect(bp.boolean('active').type).toBe('boolean');
    });
  });

  describe('date/time columns', () => {
    test('date()', () => expect(bp.date('dob').type).toBe('date'));
    test('datetime()', () => expect(bp.datetime('created').type).toBe('datetime'));
    test('timestamp()', () => expect(bp.timestamp('ts').type).toBe('timestamp'));
    test('time()', () => expect(bp.time('alarm').type).toBe('time'));
    test('year()', () => expect(bp.year('grad').type).toBe('year'));
  });

  describe('special columns', () => {
    test('json()', () => expect(bp.json('meta').type).toBe('json'));
    test('jsonb()', () => expect(bp.jsonb('data').type).toBe('jsonb'));
    test('binary()', () => expect(bp.binary('blob').type).toBe('binary'));
    test('uuid()', () => expect(bp.uuid('uid').type).toBe('uuid'));
    test('ulid()', () => expect(bp.ulid('uid').type).toBe('ulid'));
    test('ipAddress()', () => expect(bp.ipAddress('ip').type).toBe('ipAddress'));
    test('macAddress()', () => expect(bp.macAddress('mac').type).toBe('macAddress'));
    test('geometry()', () => expect(bp.geometry('geo').type).toBe('geometry'));
    test('point()', () => expect(bp.point('loc').type).toBe('point'));
    test('lineString()', () => expect(bp.lineString('path').type).toBe('lineString'));
    test('polygon()', () => expect(bp.polygon('area').type).toBe('polygon'));

    test('enum()', () => {
      const col = bp.enum('status', ['active', 'inactive']);
      expect(col.type).toBe('enum');
      expect((col as any).allowed).toEqual(['active', 'inactive']);
    });

    test('set()', () => {
      const col = bp.set('tags', ['a', 'b']);
      expect(col.type).toBe('set');
    });
  });

  describe('fluent column modifiers', () => {
    test('nullable()', () => {
      const col = bp.string('name').nullable();
      expect((col as any)._nullable).toBe(true);
    });

    test('defaultTo()', () => {
      const col = bp.string('role').defaultTo('user');
      expect((col as any)._default).toBe('user');
    });

    test('defaultRaw()', () => {
      const col = bp.timestamp('ts').defaultRaw('CURRENT_TIMESTAMP');
      expect((col as any)._default).toEqual({ __raw: 'CURRENT_TIMESTAMP' });
    });

    test('unsigned()', () => {
      const col = bp.integer('qty').unsigned();
      expect((col as any)._unsigned).toBe(true);
    });

    test('unique()', () => {
      const col = bp.string('email').unique();
      expect((col as any)._unique).toBe(true);
    });

    test('index()', () => {
      const col = bp.string('slug').index();
      expect((col as any)._index).toBe(true);
    });

    test('primary()', () => {
      const col = bp.string('code').primary();
      expect((col as any)._primary).toBe(true);
    });

    test('comment()', () => {
      const col = bp.string('name').comment('User name');
      expect((col as any)._comment).toBe('User name');
    });

    test('after()', () => {
      const col = bp.string('middle').after('first_name');
      expect((col as any)._after).toBe('first_name');
    });

    test('first()', () => {
      const col = bp.string('pk').first();
      expect((col as any)._first).toBe(true);
    });

    test('charset()', () => {
      const col = bp.string('name').charset('utf8mb4');
      expect((col as any)._charset).toBe('utf8mb4');
    });

    test('collation()', () => {
      const col = bp.string('name').collation('utf8mb4_unicode_ci');
      expect((col as any)._collation).toBe('utf8mb4_unicode_ci');
    });

    test('chaining multiple modifiers', () => {
      const col = bp.string('email').nullable().unique().comment('User email');
      expect((col as any)._nullable).toBe(true);
      expect((col as any)._unique).toBe(true);
      expect((col as any)._comment).toBe('User email');
    });
  });

  describe('relationship columns', () => {
    test('morphs() creates id and type columns + index', () => {
      bp.morphs('commentable');
      const cols = bp.getColumns();
      expect(cols).toHaveLength(2);
      expect(cols[0].name).toBe('commentable_id');
      expect(cols[1].name).toBe('commentable_type');
      expect(bp.getCommands()).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'index' })])
      );
    });

    test('nullableMorphs() creates nullable morph columns', () => {
      bp.nullableMorphs('taggable');
      const cols = bp.getColumns();
      expect((cols[0] as any)._nullable).toBe(true);
      expect((cols[1] as any)._nullable).toBe(true);
    });

    test('uuidMorphs() creates uuid morph columns', () => {
      bp.uuidMorphs('imageable');
      const cols = bp.getColumns();
      expect(cols[0].type).toBe('uuid');
      expect(cols[0].name).toBe('imageable_id');
    });

    test('ulidMorphs() creates ulid morph columns', () => {
      bp.ulidMorphs('auditable');
      const cols = bp.getColumns();
      expect(cols[0].type).toBe('ulid');
    });

    test('softDeletes() creates nullable timestamp', () => {
      const col = bp.softDeletes();
      expect(col.name).toBe('deleted_at');
      expect(col.type).toBe('timestamp');
      expect((col as any)._nullable).toBe(true);
    });

    test('softDeletes() with custom column', () => {
      expect(bp.softDeletes('removed_at').name).toBe('removed_at');
    });

    test('rememberToken() creates nullable string(100)', () => {
      const col = bp.rememberToken();
      expect(col.name).toBe('remember_token');
      expect(col.length).toBe(100);
      expect((col as any)._nullable).toBe(true);
    });

    test('timestamps() creates created_at and updated_at', () => {
      bp.timestamps();
      const cols = bp.getColumns();
      expect(cols).toHaveLength(2);
      expect(cols[0].name).toBe('created_at');
      expect(cols[1].name).toBe('updated_at');
      expect((cols[0] as any)._nullable).toBe(true);
      expect((cols[1] as any)._nullable).toBe(true);
    });
  });

  describe('index commands', () => {
    test('primary() adds primary command', () => {
      bp.primary('id');
      expect(bp.getCommands()[0]).toEqual({ type: 'primary', columns: ['id'] });
    });

    test('primary() with array', () => {
      bp.primary(['a', 'b']);
      expect(bp.getCommands()[0].columns).toEqual(['a', 'b']);
    });

    test('unique() adds unique command', () => {
      bp.unique('email', 'idx_email');
      const cmd = bp.getCommands()[0];
      expect(cmd.type).toBe('unique');
      expect(cmd.index).toBe('idx_email');
    });

    test('index() adds index command', () => {
      bp.index(['first', 'last']);
      expect(bp.getCommands()[0].columns).toEqual(['first', 'last']);
    });

    test('fullText() adds fullText command', () => {
      bp.fullText('body');
      expect(bp.getCommands()[0].type).toBe('fullText');
    });

    test('spatialIndex() adds spatialIndex command', () => {
      bp.spatialIndex('location');
      expect(bp.getCommands()[0].type).toBe('spatialIndex');
    });

    test('dropIndex()', () => {
      bp.dropIndex('idx_name');
      expect(bp.getCommands()[0]).toEqual({ type: 'dropIndex', indexes: ['idx_name'] });
    });

    test('dropUnique()', () => {
      bp.dropUnique(['idx_email']);
      expect(bp.getCommands()[0].type).toBe('dropUnique');
    });

    test('dropPrimary()', () => {
      bp.dropPrimary();
      expect(bp.getCommands()[0].type).toBe('dropPrimary');
    });

    test('dropForeign()', () => {
      bp.dropForeign('fk_user');
      expect(bp.getCommands()[0].type).toBe('dropForeign');
    });

    test('renameIndex()', () => {
      bp.renameIndex('old', 'new');
      const cmd = bp.getCommands()[0];
      expect(cmd).toEqual({ type: 'renameIndex', from: 'old', to: 'new' });
    });
  });

  describe('column modification commands', () => {
    test('dropColumn() with string', () => {
      bp.dropColumn('name');
      expect(bp.getCommands()[0]).toEqual({ type: 'dropColumn', columns: ['name'] });
    });

    test('dropColumn() with array', () => {
      bp.dropColumn(['a', 'b']);
      expect(bp.getCommands()[0].columns).toEqual(['a', 'b']);
    });

    test('renameColumn()', () => {
      bp.renameColumn('old_name', 'new_name');
      expect(bp.getCommands()[0]).toEqual({ type: 'renameColumn', from: 'old_name', to: 'new_name' });
    });

    test('drop()', () => {
      bp.drop();
      expect(bp.getCommands()[0]).toEqual({ type: 'drop' });
    });
  });

  describe('foreign keys', () => {
    test('foreign() returns ForeignKeyDefinition', () => {
      const fk = bp.foreign('user_id');
      expect(fk).toBeInstanceOf(ForeignKeyDefinition);
    });

    test('foreign() adds command', () => {
      bp.foreign('user_id');
      expect(bp.getCommands()[0].type).toBe('foreign');
    });

    test('foreign key fluent API', () => {
      const fk = bp.foreign('user_id').references('id').on('users');
      const def = fk.getDefinition();
      expect(def.columns).toEqual(['user_id']);
      expect(def.references).toEqual(['id']);
      expect(def.on).toBe('users');
    });

    test('cascadeOnDelete()', () => {
      const fk = bp.foreign('user_id').references('id').on('users').cascadeOnDelete();
      expect(fk.getDefinition().onDelete).toBe('cascade');
    });

    test('cascadeOnUpdate()', () => {
      const fk = bp.foreign('user_id').references('id').on('users').cascadeOnUpdate();
      expect(fk.getDefinition().onUpdate).toBe('cascade');
    });

    test('nullOnDelete()', () => {
      expect(bp.foreign('x').nullOnDelete().getDefinition().onDelete).toBe('set null');
    });

    test('restrictOnDelete()', () => {
      expect(bp.foreign('x').restrictOnDelete().getDefinition().onDelete).toBe('restrict');
    });

    test('restrictOnUpdate()', () => {
      expect(bp.foreign('x').restrictOnUpdate().getDefinition().onUpdate).toBe('restrict');
    });

    test('noActionOnDelete()', () => {
      expect(bp.foreign('x').noActionOnDelete().getDefinition().onDelete).toBe('no action');
    });

    test('noActionOnUpdate()', () => {
      expect(bp.foreign('x').noActionOnUpdate().getDefinition().onUpdate).toBe('no action');
    });

    test('foreign with array of columns', () => {
      const fk = bp.foreign(['user_id', 'org_id']);
      expect(fk.getDefinition().columns).toEqual(['user_id', 'org_id']);
    });
  });

  describe('build()', () => {
    test('throws not implemented', async () => {
      await expect(bp.build({} as any)).rejects.toThrow('not yet implemented');
    });
  });
});
