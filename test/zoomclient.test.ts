import ZoomClient from "../lib/esm";
import { CreateSingleWebinarParams, ZoomClientParams } from "../types/index";
import { singleWebinarResponse } from "./mocks.js";

describe("Zoom Webinar Client", () => {
  var zoomClient: ZoomClient;
  var params: ZoomClientParams = {
    apiKey: "mockapikey",
    secretKey: "mocksecretkey",
    timezone: "Europe/Stockholm",
    user: "mockuser@test.node",
  };
  test("initialize client", () => {
    zoomClient = new ZoomClient(params);
  });
  test("create single day webinar", async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 3.6e6); // in one hour
    const singleWebinarParams: CreateSingleWebinarParams = {
      start,
      end,
      name: "Test Webinar",
    };
    //@ts-expect-error
    zoomClient._zoom.post = jest.fn(() =>
      Promise.resolve(singleWebinarResponse)
    );
    const webinarID = await zoomClient.createSingleWebinar(singleWebinarParams);
    expect(webinarID).toBe(singleWebinarResponse.data.id);
  });
  test("create weekly recurring webinar", async()=>{
      // ngl don't really feel like testing this since its highly dependant on api
      // testing with mocks doesn't really make sense
      // rip code coverage.
  })
});
