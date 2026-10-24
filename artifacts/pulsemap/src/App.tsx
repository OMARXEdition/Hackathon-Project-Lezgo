import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Button } from '@/components/ui/button';
import { AppProvider } from '@/lib/app-context';
import { Shell } from '@/components/shell';
import { Blank, Panel } from '@/components/bits';
import { EventDetails } from '@/components/event-details';
import { CreateEvent } from '@/components/create-event';
import { ChatPanel, InboxPanel } from '@/components/inbox-chat';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } });

function Lost() {
  const [, nav] = useLocation();
  return (
    <Panel title="Off the map" onClose={() => nav('/')} testId="panel-not-found">
      <Blank title="This street doesn't exist" body="The link you followed leads nowhere in Istanbul." action={<Button onClick={() => nav('/')}>Back to the map</Button>} />
    </Panel>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={() => null} />
        <Route path="/events/:id">{(p) => <EventDetails key={p.id} id={Number(p.id)} />}</Route>
        <Route path="/create" component={CreateEvent} />
        <Route path="/inbox" component={InboxPanel} />
        <Route path="/chat/:eventId/:userId">{(p) => <ChatPanel key={`${p.eventId}-${p.userId}`} eventId={Number(p.eventId)} userId={Number(p.userId)} />}</Route>
        <Route component={Lost} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppProvider>
            <Shell>
              <Router />
            </Shell>
          </AppProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
