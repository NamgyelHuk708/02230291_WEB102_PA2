import { Hono } from "hono";
import { cors } from "hono/cors";
import { PrismaClient, Prisma } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "jsonwebtoken";
import axios from "axios";
import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import * as bcrypt from 'bcryptjs';

// Define type for JWT variables
type Variables = JwtVariables;

// Initialize Hono server instance with defined Variables type
const app = new Hono<{ Variables: Variables }>();

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware to enable CORS for all routes
app.use("/*", cors());

// Middleware to protect all routes under /protected using JWT authentication
app.use(
  "/protected/*",
  jwt({
    secret: 'mySecretKey', 
  })
);

// Endpoint to handle user registration
app.post("/register", async (c) => {
  const body = await c.req.json();
  const { email, password, username } = body;

  // Hash the password using bcrypt
  const bcryptHash = await bcrypt.hash(password, 10);

  try {
    // Create a new user using Prisma
    const user = await prisma.user.create({
      data: {
        email: email,
        password: bcryptHash,
        username: username,
      },
    });

    return c.json({ message: `${user.email} created successfully` });
  } catch (e) {
    // Handle PrismaClientKnownRequestError
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return c.json({ message: "Email already exists" });
      }
    }
    // Throw HTTPException with 500 status for other errors
    throw new HTTPException(500, { message: "Internal Server Error" });
  }
});

// Endpoint to handle user login
app.post("/login", async (c) => {
  const body = await c.req.json();
  const email = body.email;
  const password = body.password;

  // Retrieve user from database based on email
  const user = await prisma.user.findUnique({
    where: { email: email },
    select: { id: true, password: true },
  });

  if (!user) {
    // Return 404 if user not found
    return c.json({ message: "User not found" }, 404);
  }

  // Compare hashed password with entered password using bcrypt
  const match = await bcrypt.compare(password, user.password);

  if (match) {
    // Generate JWT token with user ID as sub and expiration time
    const payload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token will expire in 60 minutes
    };
    const secret = "mySecretKey"; 
    const token = sign(payload, secret);

    // Return login success message with JWT token
    return c.json({ message: "Login successful", token: token });
  } else {
    // Throw HTTPException with 401 status for invalid credentials
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
});

// Endpoint to fetch Pokemon data from PokeAPI
app.get("/pokemon/:name", async (c) => {
  const { name } = c.req.param();

  try {
    // Fetch Pokemon data from PokeAPI based on name
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
    return c.json({ data: response.data });
  } catch (error) {
    // Return 404 if Pokemon not found
    return c.json({ message: "Pokemon not found" }, 404);
  }
});

// Protected endpoint to allow users to catch Pokemon
app.post("/protected/catch", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    // Throw HTTPException with 401 status if JWT payload not found
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const body = await c.req.json();
  const { name, type, image } = body;

  // Check if the Pokemon already exists in the database
  let pokemon = await prisma.pokemon.findUnique({ where: { name } });

  if (!pokemon) {
    // Create a new Pokemon record if it doesn't exist
    pokemon = await prisma.pokemon.create({
      data: { name, type, image }
    });
  }

  // Connect caught Pokemon to the user via Prisma relationship
  await prisma.user.update({
    where: { id: payload.sub },
    data: { pokemons: { connect: { id: pokemon.id } } }
  });

  // Return success message with caught Pokemon data
  return c.json({ message: "Pokemon caught", data: pokemon });
});

// Endpoint to release a caught Pokemon
app.delete("/protected/release/:id", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    // Throw HTTPException with 401 status if JWT payload not found
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { id } = c.req.param();

  // Update Pokemon record to disconnect from user
  await prisma.pokemon.update({
    where: { id: Number(id) },
    data: { caughtById: null }
  });

  // Return success message when Pokemon is released
  return c.json({ message: "Pokemon released" });
});

// Endpoint to fetch all Pokemon caught by the authenticated user
app.get("/protected/caught", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    // Throw HTTPException with 401 status if JWT payload not found
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // Retrieve user's data including all caught Pokemon
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { pokemons: true }
  });

  // Return data containing all caught Pokemon
  return c.json({ data: user?.pokemons });
});

// Endpoint to create a new Pokemon record
app.post("/pokemon", async (c) => {
  try {
    const body = await c.req.json();

    // Create a new Pokemon record using data from request body
    const pokemon = await prisma.pokemon.create({
      data: {
        name: body.name,
        type: body.type,
        image: body.image,
      },
    });

    // Return success message after creating the Pokemon
    return c.json({ message: `${pokemon.name} created successfully` });
  } catch (e) {
    // Handle PrismaClientKnownRequestError
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return c.json({ message: "Pokemon already exists" });
      }
    }
    // Return error message for other errors
    return c.json({ message: "An error occurred" }, 500);
  }
});

// Endpoint to retrieve all Pokemon records from the database
app.get('/pokemon/records', async (c) => {
  try {
    // Fetch all Pokemon records from the database
    const pRecords = await prisma.pokemon.findMany();
    return c.json(pRecords);
  } catch (e) {
    // Return error message if fetching Pokemon records fails
    return c.json({ message: "An error occurred while fetching Pokémon records" }, 500);
  }
});

// Endpoint to update a specific Pokemon record
app.patch('/pokemon/update', async (c) => {
  try {
    const body = await c.req.json();

    // Update the specified Pokemon record with new data
    const updatedPokemon = await prisma.pokemon.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        type: body.type,
        image: body.image,
      },
    });

    // Return success message and updated Pokemon data
    return c.json({ message: `${updatedPokemon.name} updated successfully`, pokemon: updatedPokemon });
  } catch (e) {
    // Handle PrismaClientKnownRequestError
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        return c.json({ message: 'Pokémon not found' }, 404);
      }
    }
    // Return error message for other errors
    return c.json({ message: 'An error occurred while updating the Pokémon record' }, 500);
  }
});

// Endpoint to delete a particular Pokemon record
app.delete('/pokemon/delete', async (c) => {
  try {
    const body = await c.req.json();

    // Delete the specified Pokemon record from the database
    const deletedPokemon = await prisma.pokemon.delete({
      where: {
        id: body.id,
      },
    });

    // Return success message after deleting the Pokemon
    return c.json({ message: `Pokemon with ID ${body.id} deleted successfully` });
  } catch (error) {
    // Return error message if deleting Pokemon fails
    return c.json({ message: 'Failed to delete Pokemon' }, 500);
  }
});

export default app;
