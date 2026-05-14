import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">BTCFire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {wasmReady
              ? 'WASM engine loaded and ready.'
              : 'Loading WASM engine...'}
          </p>
          <Button
            onClick={() => {
              if (greetFn) setGreeting(greetFn('World'))
            }}
            disabled={!wasmReady}
          >
            Call WASM
          </Button>
          {greeting && (
            <p className="rounded-md bg-muted p-3 font-mono text-sm">
              {greeting}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default App
