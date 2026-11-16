// The day the browser tests run on. Much of Kuvert goes by the calendar: an evening lasts until four, a week
// starts on Monday, an envelope has its season, the horse its days, the list's posters their six months. A
// test that leans on the day it happens to run will fail on some other day. To run every browser test on
// another day:
//   KUVERT_TEST_NOW=2027-06-25T18:00:00 npm run test:e2e
// Each page then starts at that moment and time goes on from there. A test that fixes its own clock
// (page.clock.setFixedTime) keeps the one it set.
const STARTED = Date.now();
export const TEST_NOW = process.env.KUVERT_TEST_NOW ? new Date(process.env.KUVERT_TEST_NOW) : null;
if (TEST_NOW && Number.isNaN(TEST_NOW.getTime())) throw new Error("KUVERT_TEST_NOW is not a date: " + process.env.KUVERT_TEST_NOW);

/** The moment the tests take it to be: the real one, or the one asked for. */
export const testNow = () => (TEST_NOW ? new Date(TEST_NOW.getTime() + (Date.now() - STARTED)) : new Date());

/** Sets a browser context's clock to the day asked for, if one was. */
export async function onTestDay(context) {
  if (!TEST_NOW) return context;
  await context.addInitScript((ahead) => {
    const Real = Date;
    // The same clock, set ahead or back: it still runs, and timers are left alone.
    window.Date = class extends Real {
      constructor(...args) {
        super(...(args.length ? args : [Real.now() + ahead]));
      }
      static now() {
        return Real.now() + ahead;
      }
    };
  }, TEST_NOW.getTime() - STARTED);
  return context;
}
