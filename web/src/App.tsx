import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function App() {
  const [wasmReady, setWasmReady] = useState(false)
  const [greeting, setGreeting] = useState<string | null>(null)
  const [greetFn, setGreetFn] = useState<((name: string) => string) | null>(null)

  useEffect(() => {
    async function loadWasm() {
      const wasm = await import('btcfire-wasm')
      await wasm.default()
      setGreetFn(() => wasm.greet)
      setWasmReady(true)
    }
    loadWasm()
  }, [])

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 lg:px-16">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">BTCFire</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Bitcoin retirement simulator
        </p>
      </header>

      <main className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>WASM Engine</CardTitle>
            <CardDescription>
              {wasmReady
                ? 'Loaded and ready'
                : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="min-h-[44px] w-full md:w-auto"
              onClick={() => {
                if (greetFn) setGreeting(greetFn('World'))
              }}
              disabled={!wasmReady}
            >
              Call WASM
            </Button>
            {greeting && (
              <p className="rounded-md bg-muted p-3 font-mono text-sm break-words">
                {greeting}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Models</CardTitle>
            <CardDescription>Coming in Phase 3</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Power Law, Stock-to-Flow, and Bitcoin24 models will project future BTC prices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategies</CardTitle>
            <CardDescription>Coming in Phase 7</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Classic FIRE, fixed percentage, guardrails, and buy-borrow-die withdrawal strategies.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
