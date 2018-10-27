const chai = require("chai");
const mock = require("mock-fs");
const yaml = require("js-yaml");
const fs = require("fs-extra");
const path = require("path");

const generate = require("../static-site-generator/generate");

const expect = chai.expect;

describe("generate", () => {
  const createMockFileContents = (context = {}) =>
    [
      yaml.safeDump({ title: "Test Title", ...context }),
      "---",
      "<h1><%= title %></h1>"
    ].join("\n");

  const createMockConfig = (config = {}) => ({
    sourceDir: "testSourceDirectory",
    destDir: "testDestionationDirectory",
    layoutsDir: "testSourceDirectory/testLayoutsDirectory",
    ...config
  });

  it("outputs to dist/", () => {
    const mockConfig = createMockConfig();

    mock({
      "generator-config.yml": yaml.safeDump(mockConfig),
      [mockConfig.sourceDir]: {
        "index.html": "",
        "404.html": ""
      }
    });

    return generate().then(() => {
      const distFiles = fs.readdirSync(mockConfig.destDir);
      expect(distFiles)
        .to.be.an("array")
        .that.includes("index.html");
    });
  });

  it("outputs the correct file contents", () => {
    const mockConfig = createMockConfig();

    const indexFileContext = { title: "Index Title" };
    const indexFileContents = createMockFileContents(indexFileContext);

    mock({
      "generator-config.yml": yaml.safeDump(mockConfig),
      [mockConfig.sourceDir]: {
        "index.html": indexFileContents
      }
    });

    return generate().then(() => {
      const distFiles = fs.readdirSync(mockConfig.destDir);

      const outputContents = fs
        .readFileSync(path.join(mockConfig.destDir, distFiles[0]))
        .toString();

      expect(outputContents)
        .to.be.a("string")
        .that.includes(indexFileContext.title);
    });
  });

  it("handles nested directories correclty", () => {
    const mockConfig = createMockConfig();

    mock({
      "generator-config.yml": yaml.safeDump(mockConfig),
      [mockConfig.sourceDir]: {
        "index.html": "",
        posts: {
          post1: ""
        }
      }
    });

    return generate().then(() => {
      const distFiles = fs.readdirSync(mockConfig.destDir);

      expect(distFiles)
        .to.be.an("array")
        .that.includes("posts");

      const posts = fs.readdirSync(path.join(mockConfig.destDir, distFiles[1]));

      expect(posts)
        .to.be.an("array")
        .that.includes("post1");
    });
  });

  it("ignores the layouts/ directory", () => {
    const mockConfig = createMockConfig();

    mock({
      "generator-config.yml": yaml.safeDump(mockConfig),
      [mockConfig.sourceDir]: {
        "index.html": ""
      },
      [mockConfig.layoutsDir]: {
        "default.html": ""
      }
    });

    return generate().then(() => {
      const distFiles = fs.readdirSync(mockConfig.destDir);

      // TODO: Fix this test.
      // This should check for 'testLayoutsDirectory', but instead checks for
      // 'testSourceDirectory/testLayoutsDirectory' so it will always pass
      expect(distFiles).to.not.include("testLayoutsDirectory");
    });
  });

  it("renders template children correctly", () => {
    const mockConfig = createMockConfig();

    mock({
      "generator-config.yml": yaml.safeDump(mockConfig),
      [mockConfig.sourceDir]: {
        "index.html": [
          yaml.safeDump({
            layout: "default.html"
          }),
          "---",
          "<h2>I would like to be rendered inside of the default layout please</h2>"
        ].join("\n")
      },
      [mockConfig.layoutsDir]: {
        "default.html": "<div><h2>Layout Title</h2><%- children %></div>"
      }
    });

    return generate().then(() => {
      const distFiles = fs.readdirSync(mockConfig.destDir);

      const indexFileContents = fs
        .readFileSync(path.join(mockConfig.destDir, distFiles[0]))
        .toString();

      expect(indexFileContents)
        .to.include("Layout Title")
        .and.include(
          "I would like to be rendered inside of the default layout please"
        );
    });
  });
});