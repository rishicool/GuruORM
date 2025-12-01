# Database: Seeding & Factories

## Introduction

GuruORM includes the ability to seed your database with data using seed classes and model factories. All seed classes are stored in the `database/seeders` directory and all factories are stored in the `database/factories` directory.

Seeders and factories work together to populate your database with test data for development and testing purposes.

## Writing Seeders

### Generating Seeders

To generate a seeder, execute the `make:seeder` command. All seeders generated will be placed in the `database/seeders` directory:

```bash
npx guruorm make:seeder UserSeeder
```

### Writing Seeders

A seeder class contains a `run()` method which is called when the seeder is executed. Within the `run()` method, you may insert data into your database however you wish. You may use the query builder or Eloquent models to manually insert data.

Here's an example of a default seeder class:

```typescript
import { Seeder } from 'guruorm';
import { DB } from 'guruorm';

export default class UserSeeder extends Seeder {
  async run(): Promise<void> {
    // Using Query Builder
    await DB.table('users').insert([
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  }
}
```

### Using Model Factories

Instead of manually specifying the attributes for each model, you can use model factories to generate large amounts of data. First, create a factory for your model, then use it in your seeder:

```typescript
import { Seeder } from 'guruorm';
import User from '../models/User';
import UserFactory from '../factories/UserFactory';

export default class UserSeeder extends Seeder {
  async run(): Promise<void> {
    // Create 10 users using the factory
    const factory = new UserFactory();
    
    for (let i = 0; i < 10; i++) {
      const attributes = factory.definition();
      await User.create(attributes);
    }
  }
}
```

### Calling Additional Seeders

Within a seeder class, you may use the `call()` method to execute additional seed classes. Using the `call()` method allows you to break up your database seeding into multiple files so that no single seeder class becomes too large:

```typescript
import { Seeder } from 'guruorm';
import UserSeeder from './UserSeeder';
import PostSeeder from './PostSeeder';
import CommentSeeder from './CommentSeeder';

export default class DatabaseSeeder extends Seeder {
  async run(): Promise<void> {
    await this.call(UserSeeder);
    await this.call(PostSeeder);
    await this.call(CommentSeeder);
  }
}
```

You may also pass an array of seeder classes to the `call()` method:

```typescript
async run(): Promise<void> {
  await this.call([
    UserSeeder,
    PostSeeder,
    CommentSeeder,
  ]);
}
```

## Running Seeders

You may execute the `db:seed` command to seed your database. By default, the `db:seed` command runs the `DatabaseSeeder` class, which may be used to call other seed classes:

```bash
npx guruorm db:seed
```

### Seeding Specific Seeders

You may also specify a specific seeder class to run individually using the `--class` option:

```bash
npx guruorm db:seed --class=UserSeeder
```

### Forcing Seeders in Production

Some seeding operations may cause you to alter or lose data. In order to protect you from running seeding commands against your production database, you will be prompted for confirmation before the seeders are executed in the production environment. To force the seeders to run without a prompt, use the `--force` flag:

```bash
npx guruorm db:seed --force
```

## Model Factories

### Introduction

When testing your application or seeding your database, you may need to insert a few records into your database. Instead of manually specifying the value of each column, GuruORM allows you to define a set of default attributes for each of your Eloquent models using model factories.

### Generating Factories

To create a factory, execute the `make:factory` command:

```bash
npx guruorm make:factory UserFactory
```

The new factory class will be placed in your `database/factories` directory.

### Factory Definition

Factory classes contain a `definition()` method that returns the default set of attribute values that should be applied when creating a model using the factory:

```typescript
import { Factory } from 'guruorm';

export default class UserFactory extends Factory {
  definition(): Record<string, any> {
    return {
      name: this.faker.person.fullName(),
      email: this.faker.internet.email(),
      email_verified_at: new Date(),
      password: 'password123',
      remember_token: this.faker.string.alphanumeric(10),
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
}
```

As you can see, in their most basic form, factories are classes that extend GuruORM's base factory class and define a `definition()` method. The `definition()` method returns the default set of attribute values that should be applied when creating a model using the factory.

### Using Faker

Via the `faker` property, factories have access to the [Faker](https://fakerjs.dev/) library, which allows you to conveniently generate various kinds of random data for testing and seeding:

```typescript
definition(): Record<string, any> {
  return {
    name: this.faker.person.fullName(),
    email: this.faker.internet.email(),
    phone: this.faker.phone.number(),
    address: this.faker.location.streetAddress(),
    city: this.faker.location.city(),
    country: this.faker.location.country(),
    bio: this.faker.lorem.paragraph(),
    website: this.faker.internet.url(),
    company: this.faker.company.name(),
    job_title: this.faker.person.jobTitle(),
    avatar: this.faker.image.avatar(),
    birth_date: this.faker.date.past({ years: 30 }),
    is_admin: this.faker.datatype.boolean(),
    score: this.faker.number.int({ min: 0, max: 100 }),
    rating: this.faker.number.float({ min: 1, max: 5, precision: 0.1 }),
  };
}
```

### Factory States

State manipulation methods allow you to define discrete modifications that can be applied to your model factories in any combination. For example, your `UserFactory` might have an `admin` state that modifies one of its default attribute values:

```typescript
import { Factory } from 'guruorm';

export default class UserFactory extends Factory {
  definition(): Record<string, any> {
    return {
      name: this.faker.person.fullName(),
      email: this.faker.internet.email(),
      is_admin: false,
      role: 'user',
    };
  }

  admin(): Record<string, any> {
    return {
      ...this.definition(),
      is_admin: true,
      role: 'admin',
    };
  }

  suspended(): Record<string, any> {
    return {
      ...this.definition(),
      suspended_at: new Date(),
      status: 'suspended',
    };
  }
}
```

### Using Factories in Seeders

Once you have defined your factories, you may use them in your seeders:

```typescript
import { Seeder } from 'guruorm';
import User from '../models/User';
import UserFactory from '../factories/UserFactory';

export default class UserSeeder extends Seeder {
  async run(): Promise<void> {
    const factory = new UserFactory();

    // Create 50 regular users
    for (let i = 0; i < 50; i++) {
      await User.create(factory.definition());
    }

    // Create 5 admin users
    for (let i = 0; i < 5; i++) {
      await User.create(factory.admin());
    }

    // Create 3 suspended users
    for (let i = 0; i < 3; i++) {
      await User.create(factory.suspended());
    }
  }
}
```

### Relationships in Factories

You may also create models with relationships using factories:

```typescript
import { Seeder } from 'guruorm';
import User from '../models/User';
import Post from '../models/Post';
import UserFactory from '../factories/UserFactory';
import PostFactory from '../factories/PostFactory';

export default class DatabaseSeeder extends Seeder {
  async run(): Promise<void> {
    const userFactory = new UserFactory();
    const postFactory = new PostFactory();

    // Create 10 users
    for (let i = 0; i < 10; i++) {
      const user = await User.create(userFactory.definition());

      // Create 3-5 posts for each user
      const postCount = Math.floor(Math.random() * 3) + 3;
      for (let j = 0; j < postCount; j++) {
        const postData = postFactory.definition();
        postData.user_id = user.id;
        await Post.create(postData);
      }
    }
  }
}
```

### Complex Factory Examples

#### E-commerce Seeder

```typescript
import { Seeder } from 'guruorm';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import UserFactory from '../factories/UserFactory';
import ProductFactory from '../factories/ProductFactory';

export default class EcommerceSeeder extends Seeder {
  async run(): Promise<void> {
    const userFactory = new UserFactory();
    const productFactory = new ProductFactory();

    // Create 100 products
    const products = [];
    for (let i = 0; i < 100; i++) {
      const product = await Product.create(productFactory.definition());
      products.push(product);
    }

    // Create 50 customers with orders
    for (let i = 0; i < 50; i++) {
      const user = await User.create(userFactory.definition());

      // Create 1-5 orders per customer
      const orderCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 0; j < orderCount; j++) {
        const order = await Order.create({
          user_id: user.id,
          status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
          total: 0,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        });

        // Add 1-10 products to each order
        let orderTotal = 0;
        const itemCount = Math.floor(Math.random() * 10) + 1;
        for (let k = 0; k < itemCount; k++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const quantity = Math.floor(Math.random() * 5) + 1;
          const price = product.price * quantity;
          orderTotal += price;

          await OrderItem.create({
            order_id: order.id,
            product_id: product.id,
            quantity: quantity,
            price: product.price,
          });
        }

        // Update order total
        order.total = orderTotal;
        await order.save();
      }
    }
  }
}
```

#### Blog Seeder with Categories and Tags

```typescript
import { Seeder } from 'guruorm';
import User from '../models/User';
import Category from '../models/Category';
import Tag from '../models/Tag';
import Post from '../models/Post';
import Comment from '../models/Comment';

export default class BlogSeeder extends Seeder {
  async run(): Promise<void> {
    // Create categories
    const categories = [];
    const categoryNames = ['Technology', 'Travel', 'Food', 'Lifestyle', 'Business'];
    for (const name of categoryNames) {
      const category = await Category.create({
        name: name,
        slug: name.toLowerCase(),
      });
      categories.push(category);
    }

    // Create tags
    const tags = [];
    const tagNames = ['tutorial', 'guide', 'tips', 'review', 'news', 'opinion'];
    for (const name of tagNames) {
      const tag = await Tag.create({
        name: name,
        slug: name,
      });
      tags.push(tag);
    }

    // Create authors
    const authors = [];
    for (let i = 0; i < 5; i++) {
      const author = await User.create({
        name: `Author ${i + 1}`,
        email: `author${i + 1}@example.com`,
        role: 'author',
      });
      authors.push(author);
    }

    // Create posts
    for (const author of authors) {
      for (let i = 0; i < 10; i++) {
        const post = await Post.create({
          title: `Post ${i + 1} by ${author.name}`,
          content: 'Lorem ipsum dolor sit amet...',
          user_id: author.id,
          category_id: categories[Math.floor(Math.random() * categories.length)].id,
          published_at: Math.random() > 0.2 ? new Date() : null,
        });

        // Attach random tags
        const postTags = tags
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3) + 1);
        
        for (const tag of postTags) {
          await post.tags().attach(tag.id);
        }

        // Add comments
        const commentCount = Math.floor(Math.random() * 5);
        for (let j = 0; j < commentCount; j++) {
          await Comment.create({
            post_id: post.id,
            author: `Commenter ${j + 1}`,
            content: 'Great post!',
          });
        }
      }
    }
  }
}
```

## Best Practices

### 1. Use Factories for Reusability

Define factories for all your models to make seeding and testing easier:

```typescript
// Good: Reusable factory
const factory = new UserFactory();
await User.create(factory.definition());

// Avoid: Hardcoded values scattered everywhere
await User.create({ name: 'John', email: 'john@example.com' });
```

### 2. Organize Seeders by Feature

Create separate seeders for different parts of your application:

```
database/seeders/
  UserSeeder.ts
  ProductSeeder.ts
  OrderSeeder.ts
  CategorySeeder.ts
  DatabaseSeeder.ts  // Calls all other seeders
```

### 3. Use Realistic Data

Use Faker to generate realistic data that closely mimics production:

```typescript
definition(): Record<string, any> {
  return {
    name: this.faker.person.fullName(),
    email: this.faker.internet.email(),
    phone: this.faker.phone.number('+1-###-###-####'),
    created_at: this.faker.date.past({ years: 2 }),
  };
}
```

### 4. Seed in the Correct Order

Always seed in the correct order to satisfy foreign key constraints:

```typescript
async run(): Promise<void> {
  // Seed parent tables first
  await this.call(UserSeeder);
  await this.call(CategorySeeder);
  
  // Then child tables
  await this.call(PostSeeder);
  await this.call(CommentSeeder);
}
```

### 5. Clean Up Before Seeding

Clear existing data before seeding to avoid duplicates:

```typescript
async run(): Promise<void> {
  // Clear existing data
  await DB.table('comments').delete();
  await DB.table('posts').delete();
  await DB.table('users').delete();
  
  // Now seed fresh data
  await this.call(UserSeeder);
  await this.call(PostSeeder);
}
```

## Seeding in Production

While it's common to seed development and testing databases, you should be extremely careful when seeding production databases. Consider these practices:

1. **Never auto-seed production** - Always require manual confirmation
2. **Use separate seeders** - Create production-specific seeders for initial data only
3. **Version control** - Keep seed data in version control
4. **Backup first** - Always backup before running seeders
5. **Use migrations for structure** - Use seeders only for data, migrations for structure

Example production seeder:

```typescript
import { Seeder } from 'guruorm';
import Role from '../models/Role';
import Permission from '../models/Permission';

export default class ProductionSeeder extends Seeder {
  async run(): Promise<void> {
    // Only seed essential data
    const roles = ['admin', 'moderator', 'user'];
    for (const role of roles) {
      await Role.firstOrCreate({ name: role });
    }

    const permissions = ['read', 'write', 'delete'];
    for (const permission of permissions) {
      await Permission.firstOrCreate({ name: permission });
    }
  }
}
```
