import { describe, expect, it } from "vitest"

import { WATCH_FINISHED, WATCH_RUNNING, WATCH_STOPPED } from "./fixtures"
import { toBrowserWatch } from "./port"

describe("Reading a watch response", () => {
  it("takes what a running task is doing from its latest step", () => {
    expect(toBrowserWatch(WATCH_RUNNING)).toEqual({
      status: "started",
      step: 7,
      currentGoal:
        'I will accept the cookies to clear the view and then search for the "Visit" or "Opening hours" section, preferably in Spanish as requested.',
      currentUrl: "https://www.museodelprado.es/",
      screenshotUrl:
        "https://cdn.browser-use.com/screenshots/6916c565-dc4f-4317-80e4-177808ac1811/7.png",
      output: null,
      success: null,
    })
  })

  it("gives a finished task's output with its line breaks restored", () => {
    expect(toBrowserWatch(WATCH_FINISHED)).toMatchObject({
      status: "finished",
      step: 10,
      output:
        "El Museo del Prado abre hoy de lunes a sábado de 10:00 h a 20:00 h.\nLos domingos y festivos el horario es de 10:00 h a 19:00 h.",
      success: true,
    })
  })

  it("prefers the current goal when Composio gives one", () => {
    expect(
      toBrowserWatch({ ...WATCH_RUNNING, current_goal: "Open the menu" })
        .currentGoal
    ).toBe("Open the menu")
  })

  it("leaves out the goal and screenshot when no new steps came", () => {
    expect(toBrowserWatch(WATCH_STOPPED)).toMatchObject({
      status: "stopped",
      currentGoal: null,
      screenshotUrl: null,
      currentUrl: "https://www.renfe.com/es/en",
    })
  })

  it("throws on a response it can't read", () => {
    expect(() => toBrowserWatch({ status: "dancing" })).toThrow()
  })
})
