"use strict";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import Api from "../src/api";

chai.use(chaiAsPromised);
chai.should();
chai.config.includeStack = true;

const root = typeof window === "object" ? window : global;
const FAKE_SERVER_URL = "http://fake-server"

describe("Api", () => {
  var sandbox, api;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    api = new Api(FAKE_SERVER_URL);
  });

  afterEach(() => {
    sandbox.restore();
  });

  function fakeServerResponse(json, headers={}) {
    return Promise.resolve({
      headers: {
        get(name) {
          return headers[name];
        }
      },
      json() {
        return json;
      }
    });
  }

  describe("#fetchChangesSince", () => {
    it("should request server for latest changes", () => {
      sandbox.stub(root, "fetch").returns(Promise.resolve());

      api.fetchChangesSince("articles", 42);

      sinon.assert.calledOnce(fetch);
      sinon.assert.calledWithMatch(fetch, /\?_since=42/);
    });

    it("should resolve with a result object", () => {
      sandbox.stub(root, "fetch").returns(
        fakeServerResponse({items: []}, {"Last-Modified": 41}));

      return api.fetchChangesSince("articles", 42)
        .should.eventually.become({
          lastModified: 41,
          changes: []
        });
    });
  });

  describe("#batch", () => {
    const operations = [
      {id: 1, title: "foo"},
      {id: 2, title: "bar"},
    ];

    describe("server request", () => {
      beforeEach(() => {
        sandbox.stub(root, "fetch").returns(Promise.resolve({status: 200}));
      });

      it("should call the batch endpoint", () => {
        api.batch("articles", "create", operations);

        sinon.assert.calledWithMatch(fetch, "/v0/batch");
      });

      it("should define default batch create request method", () => {
        api.batch("articles", "create", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).defaults.method).eql("POST");
      });

      it("should define default batch update request method", () => {
        api.batch("articles", "update", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).defaults.method).eql("PUT");
      });

      it("should define default batch delete request method", () => {
        api.batch("articles", "delete", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).defaults.method).eql("DELETE");
      });

      it("should define default batch request headers", () => {
        api.batch("articles", "create", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).defaults.headers).eql({});
      });

      it("should send the expected number of request bodies", () => {
        api.batch("articles", "create", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).requests).to.have.length.of(2);
      });

      it("should map created records to batch request bodies", () => {
        api.batch("articles", "create", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).requests[0]).eql({
          path: "/v0/collections/articles/records",
          body: { id: 1, title: "foo" },
        });
      });

      it("should map updated records to batch request bodies", () => {
        api.batch("articles", "update", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).requests[0]).eql({
          path: "/v0/collections/articles/records/1",
          body: { id: 1, title: "foo" },
        });
      });

      it("should map deleted records to batch request bodies", () => {
        api.batch("articles", "delete", operations);
        const requestOptions = fetch.getCall(0).args[1];

        expect(JSON.parse(requestOptions.body).requests[0]).eql({
          path: "/v0/collections/articles/records/1"
        });
      });
    });

    describe("server response", () => {
      beforeEach(() => {
        sandbox.stub(root, "fetch").returns();
      });
    });
  });
});
