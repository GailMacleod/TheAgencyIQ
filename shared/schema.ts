import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import * as auth from './authSchema';
import * as post from './postSchema';
import * as user from './userSchema';
import * as analytics from './analyticsSchema';
import * as platform from './platformSchema';

export { ...auth, ...post, ...user, ...analytics, ...platform };
