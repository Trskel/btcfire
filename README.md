# BTCFire

## general requirements

- The aim of the application is to simulate different scenarios of FIRE (finantial independence retire early) using bitcoin to help the retirees take the right decisions depending on their case and assumptions
-There will be different ways to estimate the future price of bitcoin: S2F, Power law, Microstrategy's Bitcoin24 and open to add more models in the future
- There will be different withdraw strategies: classic fire, guardrails, buy-borrow-die
- The user will be able to choose which price estimation model to use and configure the parameters of them.
- The user will be able to choose which withdraw strategy to use and configure the parameters of each.
- The application will use montecarlo simulations to calculate 1000s of scenarios for each case and display averages and success percentages of the different strategies for the parameters entered by the user.
- The user will be able to enter his own stack configuration: initial amount of BTC, initial year for retirement, current age...
- The application will connect to a public free API to collect the historic price of bitcoin
- The price of bitcoin and the future estimations will be displayed in visually appealing graphs
- The graphs will show the historical price of bitcoin, the future estimation ranges of bitcoin values, the average estimation values of bitcoin values, and the valuation of the user's stack during the lifetime. In the graphs there will be controls to select different parameters of the graph: log or linear values, select estimation model, and it will be possible to select different withdraw strategies that will show the results and allow to compare (individually selectable)
-There will also be a table showing the values per year.
-Technical details: the application should run entirely in the user's local browser, to allow privacy, but values will be stored locally from session to session. For the frontend we will use react in typescript, you can use whatever libraries or components you prefer to display graphs, css styles, etc. The "backend" will be done in rust, using wasm to be able to achieve fast speed calculating all the montecarlo simulations, maybe even in real time as the user changes the value swith sliders, and also to be run in local. It is also important to have the application serverless to be able to host it for free in vercel or github pages.
