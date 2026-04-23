import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import FlappyBird from "./pages/FlappyBird";
import GolfOrbit from "./pages/GolfOrbit";
import Hub from "./pages/Hub";
import SnakeGame from "./pages/SnakeGame";
import SpaceShooter from "./pages/SpaceShooter";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const hubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Layout>
      <Hub />
    </Layout>
  ),
});

const golfRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/golf",
  component: GolfOrbit,
});

const shooterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shooter",
  component: SpaceShooter,
});

const snakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/snake",
  component: SnakeGame,
});

const flappyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/flappy",
  component: FlappyBird,
});

const routeTree = rootRoute.addChildren([
  hubRoute,
  golfRoute,
  shooterRoute,
  snakeRoute,
  flappyRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
