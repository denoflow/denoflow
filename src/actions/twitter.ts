export default class TwitterSchema {
  public static schema = {
    name: "TwitterSchema",
    properties: {
      name: { type: "string" },
      username: { type: "string" },
      password: { type: "string" },
      token: { type: "string" },
      tokenSecret: { type: "string" },
      userId: { type: "string" },
      screenName: { type: "string" },
      user: { type: "string" },
    },
  };
}
