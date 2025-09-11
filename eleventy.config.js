import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import latex from "eleventy-plugin-mathjax";

export default function(eleventyConfig) {
	// Order matters, put this at the top of your configuration file.
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(latex);

  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setOutputDirectory("build");
  eleventyConfig.addPassthroughCopy("src/style.css");
};