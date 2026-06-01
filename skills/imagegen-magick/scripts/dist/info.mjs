import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { platform } from "node:os";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region ../../node_modules/commander/lib/error.js
var require_error = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* CommanderError class
	*/
	var CommanderError = class extends Error {
		/**
		* Constructs the CommanderError class
		* @param {number} exitCode suggested exit code which could be used with process.exit
		* @param {string} code an id string representing the error
		* @param {string} message human-readable description of the error
		*/
		constructor(exitCode, code, message) {
			super(message);
			Error.captureStackTrace(this, this.constructor);
			this.name = this.constructor.name;
			this.code = code;
			this.exitCode = exitCode;
			this.nestedError = void 0;
		}
	};
	/**
	* InvalidArgumentError class
	*/
	var InvalidArgumentError = class extends CommanderError {
		/**
		* Constructs the InvalidArgumentError class
		* @param {string} [message] explanation of why argument is invalid
		*/
		constructor(message) {
			super(1, "commander.invalidArgument", message);
			Error.captureStackTrace(this, this.constructor);
			this.name = this.constructor.name;
		}
	};
	exports.CommanderError = CommanderError;
	exports.InvalidArgumentError = InvalidArgumentError;
}));
//#endregion
//#region ../../node_modules/commander/lib/argument.js
var require_argument = /* @__PURE__ */ __commonJSMin(((exports) => {
	var { InvalidArgumentError } = require_error();
	var Argument = class {
		/**
		* Initialize a new command argument with the given name and description.
		* The default is that the argument is required, and you can explicitly
		* indicate this with <> around the name. Put [] around the name for an optional argument.
		*
		* @param {string} name
		* @param {string} [description]
		*/
		constructor(name, description) {
			this.description = description || "";
			this.variadic = false;
			this.parseArg = void 0;
			this.defaultValue = void 0;
			this.defaultValueDescription = void 0;
			this.argChoices = void 0;
			switch (name[0]) {
				case "<":
					this.required = true;
					this._name = name.slice(1, -1);
					break;
				case "[":
					this.required = false;
					this._name = name.slice(1, -1);
					break;
				default:
					this.required = true;
					this._name = name;
					break;
			}
			if (this._name.endsWith("...")) {
				this.variadic = true;
				this._name = this._name.slice(0, -3);
			}
		}
		/**
		* Return argument name.
		*
		* @return {string}
		*/
		name() {
			return this._name;
		}
		/**
		* @package
		*/
		_collectValue(value, previous) {
			if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
			previous.push(value);
			return previous;
		}
		/**
		* Set the default value, and optionally supply the description to be displayed in the help.
		*
		* @param {*} value
		* @param {string} [description]
		* @return {Argument}
		*/
		default(value, description) {
			this.defaultValue = value;
			this.defaultValueDescription = description;
			return this;
		}
		/**
		* Set the custom handler for processing CLI command arguments into argument values.
		*
		* @param {Function} [fn]
		* @return {Argument}
		*/
		argParser(fn) {
			this.parseArg = fn;
			return this;
		}
		/**
		* Only allow argument value to be one of choices.
		*
		* @param {string[]} values
		* @return {Argument}
		*/
		choices(values) {
			this.argChoices = values.slice();
			this.parseArg = (arg, previous) => {
				if (!this.argChoices.includes(arg)) throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
				if (this.variadic) return this._collectValue(arg, previous);
				return arg;
			};
			return this;
		}
		/**
		* Make argument required.
		*
		* @returns {Argument}
		*/
		argRequired() {
			this.required = true;
			return this;
		}
		/**
		* Make argument optional.
		*
		* @returns {Argument}
		*/
		argOptional() {
			this.required = false;
			return this;
		}
	};
	/**
	* Takes an argument and returns its human readable equivalent for help usage.
	*
	* @param {Argument} arg
	* @return {string}
	* @private
	*/
	function humanReadableArgName(arg) {
		const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
		return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
	}
	exports.Argument = Argument;
	exports.humanReadableArgName = humanReadableArgName;
}));
//#endregion
//#region ../../node_modules/commander/lib/help.js
var require_help = /* @__PURE__ */ __commonJSMin(((exports) => {
	var { humanReadableArgName } = require_argument();
	/**
	* TypeScript import types for JSDoc, used by Visual Studio Code IntelliSense and `npm run typescript-checkJS`
	* https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import-types
	* @typedef { import("./argument.js").Argument } Argument
	* @typedef { import("./command.js").Command } Command
	* @typedef { import("./option.js").Option } Option
	*/
	var Help = class {
		constructor() {
			this.helpWidth = void 0;
			this.minWidthToWrap = 40;
			this.sortSubcommands = false;
			this.sortOptions = false;
			this.showGlobalOptions = false;
		}
		/**
		* prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
		* and just before calling `formatHelp()`.
		*
		* Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
		*
		* @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
		*/
		prepareContext(contextOptions) {
			this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
		}
		/**
		* Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
		*
		* @param {Command} cmd
		* @returns {Command[]}
		*/
		visibleCommands(cmd) {
			const visibleCommands = cmd.commands.filter((cmd) => !cmd._hidden);
			const helpCommand = cmd._getHelpCommand();
			if (helpCommand && !helpCommand._hidden) visibleCommands.push(helpCommand);
			if (this.sortSubcommands) visibleCommands.sort((a, b) => {
				return a.name().localeCompare(b.name());
			});
			return visibleCommands;
		}
		/**
		* Compare options for sort.
		*
		* @param {Option} a
		* @param {Option} b
		* @returns {number}
		*/
		compareOptions(a, b) {
			const getSortKey = (option) => {
				return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
			};
			return getSortKey(a).localeCompare(getSortKey(b));
		}
		/**
		* Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
		*
		* @param {Command} cmd
		* @returns {Option[]}
		*/
		visibleOptions(cmd) {
			const visibleOptions = cmd.options.filter((option) => !option.hidden);
			const helpOption = cmd._getHelpOption();
			if (helpOption && !helpOption.hidden) {
				const removeShort = helpOption.short && cmd._findOption(helpOption.short);
				const removeLong = helpOption.long && cmd._findOption(helpOption.long);
				if (!removeShort && !removeLong) visibleOptions.push(helpOption);
				else if (helpOption.long && !removeLong) visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
				else if (helpOption.short && !removeShort) visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
			}
			if (this.sortOptions) visibleOptions.sort(this.compareOptions);
			return visibleOptions;
		}
		/**
		* Get an array of the visible global options. (Not including help.)
		*
		* @param {Command} cmd
		* @returns {Option[]}
		*/
		visibleGlobalOptions(cmd) {
			if (!this.showGlobalOptions) return [];
			const globalOptions = [];
			for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
				const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
				globalOptions.push(...visibleOptions);
			}
			if (this.sortOptions) globalOptions.sort(this.compareOptions);
			return globalOptions;
		}
		/**
		* Get an array of the arguments if any have a description.
		*
		* @param {Command} cmd
		* @returns {Argument[]}
		*/
		visibleArguments(cmd) {
			if (cmd._argsDescription) cmd.registeredArguments.forEach((argument) => {
				argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
			});
			if (cmd.registeredArguments.find((argument) => argument.description)) return cmd.registeredArguments;
			return [];
		}
		/**
		* Get the command term to show in the list of subcommands.
		*
		* @param {Command} cmd
		* @returns {string}
		*/
		subcommandTerm(cmd) {
			const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
			return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
		}
		/**
		* Get the option term to show in the list of options.
		*
		* @param {Option} option
		* @returns {string}
		*/
		optionTerm(option) {
			return option.flags;
		}
		/**
		* Get the argument term to show in the list of arguments.
		*
		* @param {Argument} argument
		* @returns {string}
		*/
		argumentTerm(argument) {
			return argument.name();
		}
		/**
		* Get the longest command term length.
		*
		* @param {Command} cmd
		* @param {Help} helper
		* @returns {number}
		*/
		longestSubcommandTermLength(cmd, helper) {
			return helper.visibleCommands(cmd).reduce((max, command) => {
				return Math.max(max, this.displayWidth(helper.styleSubcommandTerm(helper.subcommandTerm(command))));
			}, 0);
		}
		/**
		* Get the longest option term length.
		*
		* @param {Command} cmd
		* @param {Help} helper
		* @returns {number}
		*/
		longestOptionTermLength(cmd, helper) {
			return helper.visibleOptions(cmd).reduce((max, option) => {
				return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
			}, 0);
		}
		/**
		* Get the longest global option term length.
		*
		* @param {Command} cmd
		* @param {Help} helper
		* @returns {number}
		*/
		longestGlobalOptionTermLength(cmd, helper) {
			return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
				return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
			}, 0);
		}
		/**
		* Get the longest argument term length.
		*
		* @param {Command} cmd
		* @param {Help} helper
		* @returns {number}
		*/
		longestArgumentTermLength(cmd, helper) {
			return helper.visibleArguments(cmd).reduce((max, argument) => {
				return Math.max(max, this.displayWidth(helper.styleArgumentTerm(helper.argumentTerm(argument))));
			}, 0);
		}
		/**
		* Get the command usage to be displayed at the top of the built-in help.
		*
		* @param {Command} cmd
		* @returns {string}
		*/
		commandUsage(cmd) {
			let cmdName = cmd._name;
			if (cmd._aliases[0]) cmdName = cmdName + "|" + cmd._aliases[0];
			let ancestorCmdNames = "";
			for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
			return ancestorCmdNames + cmdName + " " + cmd.usage();
		}
		/**
		* Get the description for the command.
		*
		* @param {Command} cmd
		* @returns {string}
		*/
		commandDescription(cmd) {
			return cmd.description();
		}
		/**
		* Get the subcommand summary to show in the list of subcommands.
		* (Fallback to description for backwards compatibility.)
		*
		* @param {Command} cmd
		* @returns {string}
		*/
		subcommandDescription(cmd) {
			return cmd.summary() || cmd.description();
		}
		/**
		* Get the option description to show in the list of options.
		*
		* @param {Option} option
		* @return {string}
		*/
		optionDescription(option) {
			const extraInfo = [];
			if (option.argChoices) extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
			if (option.defaultValue !== void 0) {
				if (option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean") extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
			}
			if (option.presetArg !== void 0 && option.optional) extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
			if (option.envVar !== void 0) extraInfo.push(`env: ${option.envVar}`);
			if (extraInfo.length > 0) {
				const extraDescription = `(${extraInfo.join(", ")})`;
				if (option.description) return `${option.description} ${extraDescription}`;
				return extraDescription;
			}
			return option.description;
		}
		/**
		* Get the argument description to show in the list of arguments.
		*
		* @param {Argument} argument
		* @return {string}
		*/
		argumentDescription(argument) {
			const extraInfo = [];
			if (argument.argChoices) extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
			if (argument.defaultValue !== void 0) extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
			if (extraInfo.length > 0) {
				const extraDescription = `(${extraInfo.join(", ")})`;
				if (argument.description) return `${argument.description} ${extraDescription}`;
				return extraDescription;
			}
			return argument.description;
		}
		/**
		* Format a list of items, given a heading and an array of formatted items.
		*
		* @param {string} heading
		* @param {string[]} items
		* @param {Help} helper
		* @returns string[]
		*/
		formatItemList(heading, items, helper) {
			if (items.length === 0) return [];
			return [
				helper.styleTitle(heading),
				...items,
				""
			];
		}
		/**
		* Group items by their help group heading.
		*
		* @param {Command[] | Option[]} unsortedItems
		* @param {Command[] | Option[]} visibleItems
		* @param {Function} getGroup
		* @returns {Map<string, Command[] | Option[]>}
		*/
		groupItems(unsortedItems, visibleItems, getGroup) {
			const result = /* @__PURE__ */ new Map();
			unsortedItems.forEach((item) => {
				const group = getGroup(item);
				if (!result.has(group)) result.set(group, []);
			});
			visibleItems.forEach((item) => {
				const group = getGroup(item);
				if (!result.has(group)) result.set(group, []);
				result.get(group).push(item);
			});
			return result;
		}
		/**
		* Generate the built-in help text.
		*
		* @param {Command} cmd
		* @param {Help} helper
		* @returns {string}
		*/
		formatHelp(cmd, helper) {
			const termWidth = helper.padWidth(cmd, helper);
			const helpWidth = helper.helpWidth ?? 80;
			function callFormatItem(term, description) {
				return helper.formatItem(term, termWidth, description, helper);
			}
			let output = [`${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`, ""];
			const commandDescription = helper.commandDescription(cmd);
			if (commandDescription.length > 0) output = output.concat([helper.boxWrap(helper.styleCommandDescription(commandDescription), helpWidth), ""]);
			const argumentList = helper.visibleArguments(cmd).map((argument) => {
				return callFormatItem(helper.styleArgumentTerm(helper.argumentTerm(argument)), helper.styleArgumentDescription(helper.argumentDescription(argument)));
			});
			output = output.concat(this.formatItemList("Arguments:", argumentList, helper));
			this.groupItems(cmd.options, helper.visibleOptions(cmd), (option) => option.helpGroupHeading ?? "Options:").forEach((options, group) => {
				const optionList = options.map((option) => {
					return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
				});
				output = output.concat(this.formatItemList(group, optionList, helper));
			});
			if (helper.showGlobalOptions) {
				const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
					return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
				});
				output = output.concat(this.formatItemList("Global Options:", globalOptionList, helper));
			}
			this.groupItems(cmd.commands, helper.visibleCommands(cmd), (sub) => sub.helpGroup() || "Commands:").forEach((commands, group) => {
				const commandList = commands.map((sub) => {
					return callFormatItem(helper.styleSubcommandTerm(helper.subcommandTerm(sub)), helper.styleSubcommandDescription(helper.subcommandDescription(sub)));
				});
				output = output.concat(this.formatItemList(group, commandList, helper));
			});
			return output.join("\n");
		}
		/**
		* Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
		*
		* @param {string} str
		* @returns {number}
		*/
		displayWidth(str) {
			return stripColor(str).length;
		}
		/**
		* Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
		*
		* @param {string} str
		* @returns {string}
		*/
		styleTitle(str) {
			return str;
		}
		styleUsage(str) {
			return str.split(" ").map((word) => {
				if (word === "[options]") return this.styleOptionText(word);
				if (word === "[command]") return this.styleSubcommandText(word);
				if (word[0] === "[" || word[0] === "<") return this.styleArgumentText(word);
				return this.styleCommandText(word);
			}).join(" ");
		}
		styleCommandDescription(str) {
			return this.styleDescriptionText(str);
		}
		styleOptionDescription(str) {
			return this.styleDescriptionText(str);
		}
		styleSubcommandDescription(str) {
			return this.styleDescriptionText(str);
		}
		styleArgumentDescription(str) {
			return this.styleDescriptionText(str);
		}
		styleDescriptionText(str) {
			return str;
		}
		styleOptionTerm(str) {
			return this.styleOptionText(str);
		}
		styleSubcommandTerm(str) {
			return str.split(" ").map((word) => {
				if (word === "[options]") return this.styleOptionText(word);
				if (word[0] === "[" || word[0] === "<") return this.styleArgumentText(word);
				return this.styleSubcommandText(word);
			}).join(" ");
		}
		styleArgumentTerm(str) {
			return this.styleArgumentText(str);
		}
		styleOptionText(str) {
			return str;
		}
		styleArgumentText(str) {
			return str;
		}
		styleSubcommandText(str) {
			return str;
		}
		styleCommandText(str) {
			return str;
		}
		/**
		* Calculate the pad width from the maximum term length.
		*
		* @param {Command} cmd
		* @param {Help} helper
		* @returns {number}
		*/
		padWidth(cmd, helper) {
			return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
		}
		/**
		* Detect manually wrapped and indented strings by checking for line break followed by whitespace.
		*
		* @param {string} str
		* @returns {boolean}
		*/
		preformatted(str) {
			return /\n[^\S\r\n]/.test(str);
		}
		/**
		* Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
		*
		* So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
		*   TTT  DDD DDDD
		*        DD DDD
		*
		* @param {string} term
		* @param {number} termWidth
		* @param {string} description
		* @param {Help} helper
		* @returns {string}
		*/
		formatItem(term, termWidth, description, helper) {
			const itemIndent = 2;
			const itemIndentStr = " ".repeat(itemIndent);
			if (!description) return itemIndentStr + term;
			const paddedTerm = term.padEnd(termWidth + term.length - helper.displayWidth(term));
			const spacerWidth = 2;
			const remainingWidth = (this.helpWidth ?? 80) - termWidth - spacerWidth - itemIndent;
			let formattedDescription;
			if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) formattedDescription = description;
			else formattedDescription = helper.boxWrap(description, remainingWidth).replace(/\n/g, "\n" + " ".repeat(termWidth + spacerWidth));
			return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `\n${itemIndentStr}`);
		}
		/**
		* Wrap a string at whitespace, preserving existing line breaks.
		* Wrapping is skipped if the width is less than `minWidthToWrap`.
		*
		* @param {string} str
		* @param {number} width
		* @returns {string}
		*/
		boxWrap(str, width) {
			if (width < this.minWidthToWrap) return str;
			const rawLines = str.split(/\r\n|\n/);
			const chunkPattern = /[\s]*[^\s]+/g;
			const wrappedLines = [];
			rawLines.forEach((line) => {
				const chunks = line.match(chunkPattern);
				if (chunks === null) {
					wrappedLines.push("");
					return;
				}
				let sumChunks = [chunks.shift()];
				let sumWidth = this.displayWidth(sumChunks[0]);
				chunks.forEach((chunk) => {
					const visibleWidth = this.displayWidth(chunk);
					if (sumWidth + visibleWidth <= width) {
						sumChunks.push(chunk);
						sumWidth += visibleWidth;
						return;
					}
					wrappedLines.push(sumChunks.join(""));
					const nextChunk = chunk.trimStart();
					sumChunks = [nextChunk];
					sumWidth = this.displayWidth(nextChunk);
				});
				wrappedLines.push(sumChunks.join(""));
			});
			return wrappedLines.join("\n");
		}
	};
	/**
	* Strip style ANSI escape sequences from the string. In particular, SGR (Select Graphic Rendition) codes.
	*
	* @param {string} str
	* @returns {string}
	* @package
	*/
	function stripColor(str) {
		return str.replace(/\x1b\[\d*(;\d*)*m/g, "");
	}
	exports.Help = Help;
	exports.stripColor = stripColor;
}));
//#endregion
//#region ../../node_modules/commander/lib/option.js
var require_option = /* @__PURE__ */ __commonJSMin(((exports) => {
	var { InvalidArgumentError } = require_error();
	var Option = class {
		/**
		* Initialize a new `Option` with the given `flags` and `description`.
		*
		* @param {string} flags
		* @param {string} [description]
		*/
		constructor(flags, description) {
			this.flags = flags;
			this.description = description || "";
			this.required = flags.includes("<");
			this.optional = flags.includes("[");
			this.variadic = /\w\.\.\.[>\]]$/.test(flags);
			this.mandatory = false;
			const optionFlags = splitOptionFlags(flags);
			this.short = optionFlags.shortFlag;
			this.long = optionFlags.longFlag;
			this.negate = false;
			if (this.long) this.negate = this.long.startsWith("--no-");
			this.defaultValue = void 0;
			this.defaultValueDescription = void 0;
			this.presetArg = void 0;
			this.envVar = void 0;
			this.parseArg = void 0;
			this.hidden = false;
			this.argChoices = void 0;
			this.conflictsWith = [];
			this.implied = void 0;
			this.helpGroupHeading = void 0;
		}
		/**
		* Set the default value, and optionally supply the description to be displayed in the help.
		*
		* @param {*} value
		* @param {string} [description]
		* @return {Option}
		*/
		default(value, description) {
			this.defaultValue = value;
			this.defaultValueDescription = description;
			return this;
		}
		/**
		* Preset to use when option used without option-argument, especially optional but also boolean and negated.
		* The custom processing (parseArg) is called.
		*
		* @example
		* new Option('--color').default('GREYSCALE').preset('RGB');
		* new Option('--donate [amount]').preset('20').argParser(parseFloat);
		*
		* @param {*} arg
		* @return {Option}
		*/
		preset(arg) {
			this.presetArg = arg;
			return this;
		}
		/**
		* Add option name(s) that conflict with this option.
		* An error will be displayed if conflicting options are found during parsing.
		*
		* @example
		* new Option('--rgb').conflicts('cmyk');
		* new Option('--js').conflicts(['ts', 'jsx']);
		*
		* @param {(string | string[])} names
		* @return {Option}
		*/
		conflicts(names) {
			this.conflictsWith = this.conflictsWith.concat(names);
			return this;
		}
		/**
		* Specify implied option values for when this option is set and the implied options are not.
		*
		* The custom processing (parseArg) is not called on the implied values.
		*
		* @example
		* program
		*   .addOption(new Option('--log', 'write logging information to file'))
		*   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
		*
		* @param {object} impliedOptionValues
		* @return {Option}
		*/
		implies(impliedOptionValues) {
			let newImplied = impliedOptionValues;
			if (typeof impliedOptionValues === "string") newImplied = { [impliedOptionValues]: true };
			this.implied = Object.assign(this.implied || {}, newImplied);
			return this;
		}
		/**
		* Set environment variable to check for option value.
		*
		* An environment variable is only used if when processed the current option value is
		* undefined, or the source of the current value is 'default' or 'config' or 'env'.
		*
		* @param {string} name
		* @return {Option}
		*/
		env(name) {
			this.envVar = name;
			return this;
		}
		/**
		* Set the custom handler for processing CLI option arguments into option values.
		*
		* @param {Function} [fn]
		* @return {Option}
		*/
		argParser(fn) {
			this.parseArg = fn;
			return this;
		}
		/**
		* Whether the option is mandatory and must have a value after parsing.
		*
		* @param {boolean} [mandatory=true]
		* @return {Option}
		*/
		makeOptionMandatory(mandatory = true) {
			this.mandatory = !!mandatory;
			return this;
		}
		/**
		* Hide option in help.
		*
		* @param {boolean} [hide=true]
		* @return {Option}
		*/
		hideHelp(hide = true) {
			this.hidden = !!hide;
			return this;
		}
		/**
		* @package
		*/
		_collectValue(value, previous) {
			if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
			previous.push(value);
			return previous;
		}
		/**
		* Only allow option value to be one of choices.
		*
		* @param {string[]} values
		* @return {Option}
		*/
		choices(values) {
			this.argChoices = values.slice();
			this.parseArg = (arg, previous) => {
				if (!this.argChoices.includes(arg)) throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
				if (this.variadic) return this._collectValue(arg, previous);
				return arg;
			};
			return this;
		}
		/**
		* Return option name.
		*
		* @return {string}
		*/
		name() {
			if (this.long) return this.long.replace(/^--/, "");
			return this.short.replace(/^-/, "");
		}
		/**
		* Return option name, in a camelcase format that can be used
		* as an object attribute key.
		*
		* @return {string}
		*/
		attributeName() {
			if (this.negate) return camelcase(this.name().replace(/^no-/, ""));
			return camelcase(this.name());
		}
		/**
		* Set the help group heading.
		*
		* @param {string} heading
		* @return {Option}
		*/
		helpGroup(heading) {
			this.helpGroupHeading = heading;
			return this;
		}
		/**
		* Check if `arg` matches the short or long flag.
		*
		* @param {string} arg
		* @return {boolean}
		* @package
		*/
		is(arg) {
			return this.short === arg || this.long === arg;
		}
		/**
		* Return whether a boolean option.
		*
		* Options are one of boolean, negated, required argument, or optional argument.
		*
		* @return {boolean}
		* @package
		*/
		isBoolean() {
			return !this.required && !this.optional && !this.negate;
		}
	};
	/**
	* This class is to make it easier to work with dual options, without changing the existing
	* implementation. We support separate dual options for separate positive and negative options,
	* like `--build` and `--no-build`, which share a single option value. This works nicely for some
	* use cases, but is tricky for others where we want separate behaviours despite
	* the single shared option value.
	*/
	var DualOptions = class {
		/**
		* @param {Option[]} options
		*/
		constructor(options) {
			this.positiveOptions = /* @__PURE__ */ new Map();
			this.negativeOptions = /* @__PURE__ */ new Map();
			this.dualOptions = /* @__PURE__ */ new Set();
			options.forEach((option) => {
				if (option.negate) this.negativeOptions.set(option.attributeName(), option);
				else this.positiveOptions.set(option.attributeName(), option);
			});
			this.negativeOptions.forEach((value, key) => {
				if (this.positiveOptions.has(key)) this.dualOptions.add(key);
			});
		}
		/**
		* Did the value come from the option, and not from possible matching dual option?
		*
		* @param {*} value
		* @param {Option} option
		* @returns {boolean}
		*/
		valueFromOption(value, option) {
			const optionKey = option.attributeName();
			if (!this.dualOptions.has(optionKey)) return true;
			const preset = this.negativeOptions.get(optionKey).presetArg;
			const negativeValue = preset !== void 0 ? preset : false;
			return option.negate === (negativeValue === value);
		}
	};
	/**
	* Convert string from kebab-case to camelCase.
	*
	* @param {string} str
	* @return {string}
	* @private
	*/
	function camelcase(str) {
		return str.split("-").reduce((str, word) => {
			return str + word[0].toUpperCase() + word.slice(1);
		});
	}
	/**
	* Split the short and long flag out of something like '-m,--mixed <value>'
	*
	* @private
	*/
	function splitOptionFlags(flags) {
		let shortFlag;
		let longFlag;
		const shortFlagExp = /^-[^-]$/;
		const longFlagExp = /^--[^-]/;
		const flagParts = flags.split(/[ |,]+/).concat("guard");
		if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
		if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
		if (!shortFlag && shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
		if (!shortFlag && longFlagExp.test(flagParts[0])) {
			shortFlag = longFlag;
			longFlag = flagParts.shift();
		}
		if (flagParts[0].startsWith("-")) {
			const unsupportedFlag = flagParts[0];
			const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
			if (/^-[^-][^-]/.test(unsupportedFlag)) throw new Error(`${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`);
			if (shortFlagExp.test(unsupportedFlag)) throw new Error(`${baseError}
- too many short flags`);
			if (longFlagExp.test(unsupportedFlag)) throw new Error(`${baseError}
- too many long flags`);
			throw new Error(`${baseError}
- unrecognised flag format`);
		}
		if (shortFlag === void 0 && longFlag === void 0) throw new Error(`option creation failed due to no flags found in '${flags}'.`);
		return {
			shortFlag,
			longFlag
		};
	}
	exports.Option = Option;
	exports.DualOptions = DualOptions;
}));
//#endregion
//#region ../../node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = /* @__PURE__ */ __commonJSMin(((exports) => {
	var maxDistance = 3;
	function editDistance(a, b) {
		if (Math.abs(a.length - b.length) > maxDistance) return Math.max(a.length, b.length);
		const d = [];
		for (let i = 0; i <= a.length; i++) d[i] = [i];
		for (let j = 0; j <= b.length; j++) d[0][j] = j;
		for (let j = 1; j <= b.length; j++) for (let i = 1; i <= a.length; i++) {
			let cost = 1;
			if (a[i - 1] === b[j - 1]) cost = 0;
			else cost = 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
		}
		return d[a.length][b.length];
	}
	/**
	* Find close matches, restricted to same number of edits.
	*
	* @param {string} word
	* @param {string[]} candidates
	* @returns {string}
	*/
	function suggestSimilar(word, candidates) {
		if (!candidates || candidates.length === 0) return "";
		candidates = Array.from(new Set(candidates));
		const searchingOptions = word.startsWith("--");
		if (searchingOptions) {
			word = word.slice(2);
			candidates = candidates.map((candidate) => candidate.slice(2));
		}
		let similar = [];
		let bestDistance = maxDistance;
		const minSimilarity = .4;
		candidates.forEach((candidate) => {
			if (candidate.length <= 1) return;
			const distance = editDistance(word, candidate);
			const length = Math.max(word.length, candidate.length);
			if ((length - distance) / length > minSimilarity) {
				if (distance < bestDistance) {
					bestDistance = distance;
					similar = [candidate];
				} else if (distance === bestDistance) similar.push(candidate);
			}
		});
		similar.sort((a, b) => a.localeCompare(b));
		if (searchingOptions) similar = similar.map((candidate) => `--${candidate}`);
		if (similar.length > 1) return `\n(Did you mean one of ${similar.join(", ")}?)`;
		if (similar.length === 1) return `\n(Did you mean ${similar[0]}?)`;
		return "";
	}
	exports.suggestSimilar = suggestSimilar;
}));
//#endregion
//#region ../../node_modules/commander/lib/command.js
var require_command = /* @__PURE__ */ __commonJSMin(((exports) => {
	var EventEmitter = __require("node:events").EventEmitter;
	var childProcess = __require("node:child_process");
	var path = __require("node:path");
	var fs = __require("node:fs");
	var process$1 = __require("node:process");
	var { Argument, humanReadableArgName } = require_argument();
	var { CommanderError } = require_error();
	var { Help, stripColor } = require_help();
	var { Option, DualOptions } = require_option();
	var { suggestSimilar } = require_suggestSimilar();
	var Command = class Command extends EventEmitter {
		/**
		* Initialize a new `Command`.
		*
		* @param {string} [name]
		*/
		constructor(name) {
			super();
			/** @type {Command[]} */
			this.commands = [];
			/** @type {Option[]} */
			this.options = [];
			this.parent = null;
			this._allowUnknownOption = false;
			this._allowExcessArguments = false;
			/** @type {Argument[]} */
			this.registeredArguments = [];
			this._args = this.registeredArguments;
			/** @type {string[]} */
			this.args = [];
			this.rawArgs = [];
			this.processedArgs = [];
			this._scriptPath = null;
			this._name = name || "";
			this._optionValues = {};
			this._optionValueSources = {};
			this._storeOptionsAsProperties = false;
			this._actionHandler = null;
			this._executableHandler = false;
			this._executableFile = null;
			this._executableDir = null;
			this._defaultCommandName = null;
			this._exitCallback = null;
			this._aliases = [];
			this._combineFlagAndOptionalValue = true;
			this._description = "";
			this._summary = "";
			this._argsDescription = void 0;
			this._enablePositionalOptions = false;
			this._passThroughOptions = false;
			this._lifeCycleHooks = {};
			/** @type {(boolean | string)} */
			this._showHelpAfterError = false;
			this._showSuggestionAfterError = true;
			this._savedState = null;
			this._outputConfiguration = {
				writeOut: (str) => process$1.stdout.write(str),
				writeErr: (str) => process$1.stderr.write(str),
				outputError: (str, write) => write(str),
				getOutHelpWidth: () => process$1.stdout.isTTY ? process$1.stdout.columns : void 0,
				getErrHelpWidth: () => process$1.stderr.isTTY ? process$1.stderr.columns : void 0,
				getOutHasColors: () => useColor() ?? (process$1.stdout.isTTY && process$1.stdout.hasColors?.()),
				getErrHasColors: () => useColor() ?? (process$1.stderr.isTTY && process$1.stderr.hasColors?.()),
				stripColor: (str) => stripColor(str)
			};
			this._hidden = false;
			/** @type {(Option | null | undefined)} */
			this._helpOption = void 0;
			this._addImplicitHelpCommand = void 0;
			/** @type {Command} */
			this._helpCommand = void 0;
			this._helpConfiguration = {};
			/** @type {string | undefined} */
			this._helpGroupHeading = void 0;
			/** @type {string | undefined} */
			this._defaultCommandGroup = void 0;
			/** @type {string | undefined} */
			this._defaultOptionGroup = void 0;
		}
		/**
		* Copy settings that are useful to have in common across root command and subcommands.
		*
		* (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
		*
		* @param {Command} sourceCommand
		* @return {Command} `this` command for chaining
		*/
		copyInheritedSettings(sourceCommand) {
			this._outputConfiguration = sourceCommand._outputConfiguration;
			this._helpOption = sourceCommand._helpOption;
			this._helpCommand = sourceCommand._helpCommand;
			this._helpConfiguration = sourceCommand._helpConfiguration;
			this._exitCallback = sourceCommand._exitCallback;
			this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
			this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
			this._allowExcessArguments = sourceCommand._allowExcessArguments;
			this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
			this._showHelpAfterError = sourceCommand._showHelpAfterError;
			this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
			return this;
		}
		/**
		* @returns {Command[]}
		* @private
		*/
		_getCommandAndAncestors() {
			const result = [];
			for (let command = this; command; command = command.parent) result.push(command);
			return result;
		}
		/**
		* Define a command.
		*
		* There are two styles of command: pay attention to where to put the description.
		*
		* @example
		* // Command implemented using action handler (description is supplied separately to `.command`)
		* program
		*   .command('clone <source> [destination]')
		*   .description('clone a repository into a newly created directory')
		*   .action((source, destination) => {
		*     console.log('clone command called');
		*   });
		*
		* // Command implemented using separate executable file (description is second parameter to `.command`)
		* program
		*   .command('start <service>', 'start named service')
		*   .command('stop [service]', 'stop named service, or all if no name supplied');
		*
		* @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
		* @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
		* @param {object} [execOpts] - configuration options (for executable)
		* @return {Command} returns new command for action handler, or `this` for executable command
		*/
		command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
			let desc = actionOptsOrExecDesc;
			let opts = execOpts;
			if (typeof desc === "object" && desc !== null) {
				opts = desc;
				desc = null;
			}
			opts = opts || {};
			const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
			const cmd = this.createCommand(name);
			if (desc) {
				cmd.description(desc);
				cmd._executableHandler = true;
			}
			if (opts.isDefault) this._defaultCommandName = cmd._name;
			cmd._hidden = !!(opts.noHelp || opts.hidden);
			cmd._executableFile = opts.executableFile || null;
			if (args) cmd.arguments(args);
			this._registerCommand(cmd);
			cmd.parent = this;
			cmd.copyInheritedSettings(this);
			if (desc) return this;
			return cmd;
		}
		/**
		* Factory routine to create a new unattached command.
		*
		* See .command() for creating an attached subcommand, which uses this routine to
		* create the command. You can override createCommand to customise subcommands.
		*
		* @param {string} [name]
		* @return {Command} new command
		*/
		createCommand(name) {
			return new Command(name);
		}
		/**
		* You can customise the help with a subclass of Help by overriding createHelp,
		* or by overriding Help properties using configureHelp().
		*
		* @return {Help}
		*/
		createHelp() {
			return Object.assign(new Help(), this.configureHelp());
		}
		/**
		* You can customise the help by overriding Help properties using configureHelp(),
		* or with a subclass of Help by overriding createHelp().
		*
		* @param {object} [configuration] - configuration options
		* @return {(Command | object)} `this` command for chaining, or stored configuration
		*/
		configureHelp(configuration) {
			if (configuration === void 0) return this._helpConfiguration;
			this._helpConfiguration = configuration;
			return this;
		}
		/**
		* The default output goes to stdout and stderr. You can customise this for special
		* applications. You can also customise the display of errors by overriding outputError.
		*
		* The configuration properties are all functions:
		*
		*     // change how output being written, defaults to stdout and stderr
		*     writeOut(str)
		*     writeErr(str)
		*     // change how output being written for errors, defaults to writeErr
		*     outputError(str, write) // used for displaying errors and not used for displaying help
		*     // specify width for wrapping help
		*     getOutHelpWidth()
		*     getErrHelpWidth()
		*     // color support, currently only used with Help
		*     getOutHasColors()
		*     getErrHasColors()
		*     stripColor() // used to remove ANSI escape codes if output does not have colors
		*
		* @param {object} [configuration] - configuration options
		* @return {(Command | object)} `this` command for chaining, or stored configuration
		*/
		configureOutput(configuration) {
			if (configuration === void 0) return this._outputConfiguration;
			this._outputConfiguration = {
				...this._outputConfiguration,
				...configuration
			};
			return this;
		}
		/**
		* Display the help or a custom message after an error occurs.
		*
		* @param {(boolean|string)} [displayHelp]
		* @return {Command} `this` command for chaining
		*/
		showHelpAfterError(displayHelp = true) {
			if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
			this._showHelpAfterError = displayHelp;
			return this;
		}
		/**
		* Display suggestion of similar commands for unknown commands, or options for unknown options.
		*
		* @param {boolean} [displaySuggestion]
		* @return {Command} `this` command for chaining
		*/
		showSuggestionAfterError(displaySuggestion = true) {
			this._showSuggestionAfterError = !!displaySuggestion;
			return this;
		}
		/**
		* Add a prepared subcommand.
		*
		* See .command() for creating an attached subcommand which inherits settings from its parent.
		*
		* @param {Command} cmd - new subcommand
		* @param {object} [opts] - configuration options
		* @return {Command} `this` command for chaining
		*/
		addCommand(cmd, opts) {
			if (!cmd._name) throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
			opts = opts || {};
			if (opts.isDefault) this._defaultCommandName = cmd._name;
			if (opts.noHelp || opts.hidden) cmd._hidden = true;
			this._registerCommand(cmd);
			cmd.parent = this;
			cmd._checkForBrokenPassThrough();
			return this;
		}
		/**
		* Factory routine to create a new unattached argument.
		*
		* See .argument() for creating an attached argument, which uses this routine to
		* create the argument. You can override createArgument to return a custom argument.
		*
		* @param {string} name
		* @param {string} [description]
		* @return {Argument} new argument
		*/
		createArgument(name, description) {
			return new Argument(name, description);
		}
		/**
		* Define argument syntax for command.
		*
		* The default is that the argument is required, and you can explicitly
		* indicate this with <> around the name. Put [] around the name for an optional argument.
		*
		* @example
		* program.argument('<input-file>');
		* program.argument('[output-file]');
		*
		* @param {string} name
		* @param {string} [description]
		* @param {(Function|*)} [parseArg] - custom argument processing function or default value
		* @param {*} [defaultValue]
		* @return {Command} `this` command for chaining
		*/
		argument(name, description, parseArg, defaultValue) {
			const argument = this.createArgument(name, description);
			if (typeof parseArg === "function") argument.default(defaultValue).argParser(parseArg);
			else argument.default(parseArg);
			this.addArgument(argument);
			return this;
		}
		/**
		* Define argument syntax for command, adding multiple at once (without descriptions).
		*
		* See also .argument().
		*
		* @example
		* program.arguments('<cmd> [env]');
		*
		* @param {string} names
		* @return {Command} `this` command for chaining
		*/
		arguments(names) {
			names.trim().split(/ +/).forEach((detail) => {
				this.argument(detail);
			});
			return this;
		}
		/**
		* Define argument syntax for command, adding a prepared argument.
		*
		* @param {Argument} argument
		* @return {Command} `this` command for chaining
		*/
		addArgument(argument) {
			const previousArgument = this.registeredArguments.slice(-1)[0];
			if (previousArgument?.variadic) throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
			if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
			this.registeredArguments.push(argument);
			return this;
		}
		/**
		* Customise or override default help command. By default a help command is automatically added if your command has subcommands.
		*
		* @example
		*    program.helpCommand('help [cmd]');
		*    program.helpCommand('help [cmd]', 'show help');
		*    program.helpCommand(false); // suppress default help command
		*    program.helpCommand(true); // add help command even if no subcommands
		*
		* @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
		* @param {string} [description] - custom description
		* @return {Command} `this` command for chaining
		*/
		helpCommand(enableOrNameAndArgs, description) {
			if (typeof enableOrNameAndArgs === "boolean") {
				this._addImplicitHelpCommand = enableOrNameAndArgs;
				if (enableOrNameAndArgs && this._defaultCommandGroup) this._initCommandGroup(this._getHelpCommand());
				return this;
			}
			const [, helpName, helpArgs] = (enableOrNameAndArgs ?? "help [command]").match(/([^ ]+) *(.*)/);
			const helpDescription = description ?? "display help for command";
			const helpCommand = this.createCommand(helpName);
			helpCommand.helpOption(false);
			if (helpArgs) helpCommand.arguments(helpArgs);
			if (helpDescription) helpCommand.description(helpDescription);
			this._addImplicitHelpCommand = true;
			this._helpCommand = helpCommand;
			if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
			return this;
		}
		/**
		* Add prepared custom help command.
		*
		* @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
		* @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
		* @return {Command} `this` command for chaining
		*/
		addHelpCommand(helpCommand, deprecatedDescription) {
			if (typeof helpCommand !== "object") {
				this.helpCommand(helpCommand, deprecatedDescription);
				return this;
			}
			this._addImplicitHelpCommand = true;
			this._helpCommand = helpCommand;
			this._initCommandGroup(helpCommand);
			return this;
		}
		/**
		* Lazy create help command.
		*
		* @return {(Command|null)}
		* @package
		*/
		_getHelpCommand() {
			if (this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"))) {
				if (this._helpCommand === void 0) this.helpCommand(void 0, void 0);
				return this._helpCommand;
			}
			return null;
		}
		/**
		* Add hook for life cycle event.
		*
		* @param {string} event
		* @param {Function} listener
		* @return {Command} `this` command for chaining
		*/
		hook(event, listener) {
			const allowedValues = [
				"preSubcommand",
				"preAction",
				"postAction"
			];
			if (!allowedValues.includes(event)) throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
			if (this._lifeCycleHooks[event]) this._lifeCycleHooks[event].push(listener);
			else this._lifeCycleHooks[event] = [listener];
			return this;
		}
		/**
		* Register callback to use as replacement for calling process.exit.
		*
		* @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
		* @return {Command} `this` command for chaining
		*/
		exitOverride(fn) {
			if (fn) this._exitCallback = fn;
			else this._exitCallback = (err) => {
				if (err.code !== "commander.executeSubCommandAsync") throw err;
			};
			return this;
		}
		/**
		* Call process.exit, and _exitCallback if defined.
		*
		* @param {number} exitCode exit code for using with process.exit
		* @param {string} code an id string representing the error
		* @param {string} message human-readable description of the error
		* @return never
		* @private
		*/
		_exit(exitCode, code, message) {
			if (this._exitCallback) this._exitCallback(new CommanderError(exitCode, code, message));
			process$1.exit(exitCode);
		}
		/**
		* Register callback `fn` for the command.
		*
		* @example
		* program
		*   .command('serve')
		*   .description('start service')
		*   .action(function() {
		*      // do work here
		*   });
		*
		* @param {Function} fn
		* @return {Command} `this` command for chaining
		*/
		action(fn) {
			const listener = (args) => {
				const expectedArgsCount = this.registeredArguments.length;
				const actionArgs = args.slice(0, expectedArgsCount);
				if (this._storeOptionsAsProperties) actionArgs[expectedArgsCount] = this;
				else actionArgs[expectedArgsCount] = this.opts();
				actionArgs.push(this);
				return fn.apply(this, actionArgs);
			};
			this._actionHandler = listener;
			return this;
		}
		/**
		* Factory routine to create a new unattached option.
		*
		* See .option() for creating an attached option, which uses this routine to
		* create the option. You can override createOption to return a custom option.
		*
		* @param {string} flags
		* @param {string} [description]
		* @return {Option} new option
		*/
		createOption(flags, description) {
			return new Option(flags, description);
		}
		/**
		* Wrap parseArgs to catch 'commander.invalidArgument'.
		*
		* @param {(Option | Argument)} target
		* @param {string} value
		* @param {*} previous
		* @param {string} invalidArgumentMessage
		* @private
		*/
		_callParseArg(target, value, previous, invalidArgumentMessage) {
			try {
				return target.parseArg(value, previous);
			} catch (err) {
				if (err.code === "commander.invalidArgument") {
					const message = `${invalidArgumentMessage} ${err.message}`;
					this.error(message, {
						exitCode: err.exitCode,
						code: err.code
					});
				}
				throw err;
			}
		}
		/**
		* Check for option flag conflicts.
		* Register option if no conflicts found, or throw on conflict.
		*
		* @param {Option} option
		* @private
		*/
		_registerOption(option) {
			const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
			if (matchingOption) {
				const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
				throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
			}
			this._initOptionGroup(option);
			this.options.push(option);
		}
		/**
		* Check for command name and alias conflicts with existing commands.
		* Register command if no conflicts found, or throw on conflict.
		*
		* @param {Command} command
		* @private
		*/
		_registerCommand(command) {
			const knownBy = (cmd) => {
				return [cmd.name()].concat(cmd.aliases());
			};
			const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
			if (alreadyUsed) {
				const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
				const newCmd = knownBy(command).join("|");
				throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
			}
			this._initCommandGroup(command);
			this.commands.push(command);
		}
		/**
		* Add an option.
		*
		* @param {Option} option
		* @return {Command} `this` command for chaining
		*/
		addOption(option) {
			this._registerOption(option);
			const oname = option.name();
			const name = option.attributeName();
			if (option.negate) {
				const positiveLongFlag = option.long.replace(/^--no-/, "--");
				if (!this._findOption(positiveLongFlag)) this.setOptionValueWithSource(name, option.defaultValue === void 0 ? true : option.defaultValue, "default");
			} else if (option.defaultValue !== void 0) this.setOptionValueWithSource(name, option.defaultValue, "default");
			const handleOptionValue = (val, invalidValueMessage, valueSource) => {
				if (val == null && option.presetArg !== void 0) val = option.presetArg;
				const oldValue = this.getOptionValue(name);
				if (val !== null && option.parseArg) val = this._callParseArg(option, val, oldValue, invalidValueMessage);
				else if (val !== null && option.variadic) val = option._collectValue(val, oldValue);
				if (val == null) if (option.negate) val = false;
				else if (option.isBoolean() || option.optional) val = true;
				else val = "";
				this.setOptionValueWithSource(name, val, valueSource);
			};
			this.on("option:" + oname, (val) => {
				handleOptionValue(val, `error: option '${option.flags}' argument '${val}' is invalid.`, "cli");
			});
			if (option.envVar) this.on("optionEnv:" + oname, (val) => {
				handleOptionValue(val, `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`, "env");
			});
			return this;
		}
		/**
		* Internal implementation shared by .option() and .requiredOption()
		*
		* @return {Command} `this` command for chaining
		* @private
		*/
		_optionEx(config, flags, description, fn, defaultValue) {
			if (typeof flags === "object" && flags instanceof Option) throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
			const option = this.createOption(flags, description);
			option.makeOptionMandatory(!!config.mandatory);
			if (typeof fn === "function") option.default(defaultValue).argParser(fn);
			else if (fn instanceof RegExp) {
				const regex = fn;
				fn = (val, def) => {
					const m = regex.exec(val);
					return m ? m[0] : def;
				};
				option.default(defaultValue).argParser(fn);
			} else option.default(fn);
			return this.addOption(option);
		}
		/**
		* Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
		*
		* The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
		* option-argument is indicated by `<>` and an optional option-argument by `[]`.
		*
		* See the README for more details, and see also addOption() and requiredOption().
		*
		* @example
		* program
		*     .option('-p, --pepper', 'add pepper')
		*     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
		*     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
		*     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
		*
		* @param {string} flags
		* @param {string} [description]
		* @param {(Function|*)} [parseArg] - custom option processing function or default value
		* @param {*} [defaultValue]
		* @return {Command} `this` command for chaining
		*/
		option(flags, description, parseArg, defaultValue) {
			return this._optionEx({}, flags, description, parseArg, defaultValue);
		}
		/**
		* Add a required option which must have a value after parsing. This usually means
		* the option must be specified on the command line. (Otherwise the same as .option().)
		*
		* The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
		*
		* @param {string} flags
		* @param {string} [description]
		* @param {(Function|*)} [parseArg] - custom option processing function or default value
		* @param {*} [defaultValue]
		* @return {Command} `this` command for chaining
		*/
		requiredOption(flags, description, parseArg, defaultValue) {
			return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
		}
		/**
		* Alter parsing of short flags with optional values.
		*
		* @example
		* // for `.option('-f,--flag [value]'):
		* program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
		* program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
		*
		* @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
		* @return {Command} `this` command for chaining
		*/
		combineFlagAndOptionalValue(combine = true) {
			this._combineFlagAndOptionalValue = !!combine;
			return this;
		}
		/**
		* Allow unknown options on the command line.
		*
		* @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
		* @return {Command} `this` command for chaining
		*/
		allowUnknownOption(allowUnknown = true) {
			this._allowUnknownOption = !!allowUnknown;
			return this;
		}
		/**
		* Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
		*
		* @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
		* @return {Command} `this` command for chaining
		*/
		allowExcessArguments(allowExcess = true) {
			this._allowExcessArguments = !!allowExcess;
			return this;
		}
		/**
		* Enable positional options. Positional means global options are specified before subcommands which lets
		* subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
		* The default behaviour is non-positional and global options may appear anywhere on the command line.
		*
		* @param {boolean} [positional]
		* @return {Command} `this` command for chaining
		*/
		enablePositionalOptions(positional = true) {
			this._enablePositionalOptions = !!positional;
			return this;
		}
		/**
		* Pass through options that come after command-arguments rather than treat them as command-options,
		* so actual command-options come before command-arguments. Turning this on for a subcommand requires
		* positional options to have been enabled on the program (parent commands).
		* The default behaviour is non-positional and options may appear before or after command-arguments.
		*
		* @param {boolean} [passThrough] for unknown options.
		* @return {Command} `this` command for chaining
		*/
		passThroughOptions(passThrough = true) {
			this._passThroughOptions = !!passThrough;
			this._checkForBrokenPassThrough();
			return this;
		}
		/**
		* @private
		*/
		_checkForBrokenPassThrough() {
			if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
		}
		/**
		* Whether to store option values as properties on command object,
		* or store separately (specify false). In both cases the option values can be accessed using .opts().
		*
		* @param {boolean} [storeAsProperties=true]
		* @return {Command} `this` command for chaining
		*/
		storeOptionsAsProperties(storeAsProperties = true) {
			if (this.options.length) throw new Error("call .storeOptionsAsProperties() before adding options");
			if (Object.keys(this._optionValues).length) throw new Error("call .storeOptionsAsProperties() before setting option values");
			this._storeOptionsAsProperties = !!storeAsProperties;
			return this;
		}
		/**
		* Retrieve option value.
		*
		* @param {string} key
		* @return {object} value
		*/
		getOptionValue(key) {
			if (this._storeOptionsAsProperties) return this[key];
			return this._optionValues[key];
		}
		/**
		* Store option value.
		*
		* @param {string} key
		* @param {object} value
		* @return {Command} `this` command for chaining
		*/
		setOptionValue(key, value) {
			return this.setOptionValueWithSource(key, value, void 0);
		}
		/**
		* Store option value and where the value came from.
		*
		* @param {string} key
		* @param {object} value
		* @param {string} source - expected values are default/config/env/cli/implied
		* @return {Command} `this` command for chaining
		*/
		setOptionValueWithSource(key, value, source) {
			if (this._storeOptionsAsProperties) this[key] = value;
			else this._optionValues[key] = value;
			this._optionValueSources[key] = source;
			return this;
		}
		/**
		* Get source of option value.
		* Expected values are default | config | env | cli | implied
		*
		* @param {string} key
		* @return {string}
		*/
		getOptionValueSource(key) {
			return this._optionValueSources[key];
		}
		/**
		* Get source of option value. See also .optsWithGlobals().
		* Expected values are default | config | env | cli | implied
		*
		* @param {string} key
		* @return {string}
		*/
		getOptionValueSourceWithGlobals(key) {
			let source;
			this._getCommandAndAncestors().forEach((cmd) => {
				if (cmd.getOptionValueSource(key) !== void 0) source = cmd.getOptionValueSource(key);
			});
			return source;
		}
		/**
		* Get user arguments from implied or explicit arguments.
		* Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
		*
		* @private
		*/
		_prepareUserArgs(argv, parseOptions) {
			if (argv !== void 0 && !Array.isArray(argv)) throw new Error("first parameter to parse must be array or undefined");
			parseOptions = parseOptions || {};
			if (argv === void 0 && parseOptions.from === void 0) {
				if (process$1.versions?.electron) parseOptions.from = "electron";
				const execArgv = process$1.execArgv ?? [];
				if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) parseOptions.from = "eval";
			}
			if (argv === void 0) argv = process$1.argv;
			this.rawArgs = argv.slice();
			let userArgs;
			switch (parseOptions.from) {
				case void 0:
				case "node":
					this._scriptPath = argv[1];
					userArgs = argv.slice(2);
					break;
				case "electron":
					if (process$1.defaultApp) {
						this._scriptPath = argv[1];
						userArgs = argv.slice(2);
					} else userArgs = argv.slice(1);
					break;
				case "user":
					userArgs = argv.slice(0);
					break;
				case "eval":
					userArgs = argv.slice(1);
					break;
				default: throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
			}
			if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
			this._name = this._name || "program";
			return userArgs;
		}
		/**
		* Parse `argv`, setting options and invoking commands when defined.
		*
		* Use parseAsync instead of parse if any of your action handlers are async.
		*
		* Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
		*
		* Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
		* - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
		* - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
		* - `'user'`: just user arguments
		*
		* @example
		* program.parse(); // parse process.argv and auto-detect electron and special node flags
		* program.parse(process.argv); // assume argv[0] is app and argv[1] is script
		* program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
		*
		* @param {string[]} [argv] - optional, defaults to process.argv
		* @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
		* @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
		* @return {Command} `this` command for chaining
		*/
		parse(argv, parseOptions) {
			this._prepareForParse();
			const userArgs = this._prepareUserArgs(argv, parseOptions);
			this._parseCommand([], userArgs);
			return this;
		}
		/**
		* Parse `argv`, setting options and invoking commands when defined.
		*
		* Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
		*
		* Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
		* - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
		* - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
		* - `'user'`: just user arguments
		*
		* @example
		* await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
		* await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
		* await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
		*
		* @param {string[]} [argv]
		* @param {object} [parseOptions]
		* @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
		* @return {Promise}
		*/
		async parseAsync(argv, parseOptions) {
			this._prepareForParse();
			const userArgs = this._prepareUserArgs(argv, parseOptions);
			await this._parseCommand([], userArgs);
			return this;
		}
		_prepareForParse() {
			if (this._savedState === null) this.saveStateBeforeParse();
			else this.restoreStateBeforeParse();
		}
		/**
		* Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
		* Not usually called directly, but available for subclasses to save their custom state.
		*
		* This is called in a lazy way. Only commands used in parsing chain will have state saved.
		*/
		saveStateBeforeParse() {
			this._savedState = {
				_name: this._name,
				_optionValues: { ...this._optionValues },
				_optionValueSources: { ...this._optionValueSources }
			};
		}
		/**
		* Restore state before parse for calls after the first.
		* Not usually called directly, but available for subclasses to save their custom state.
		*
		* This is called in a lazy way. Only commands used in parsing chain will have state restored.
		*/
		restoreStateBeforeParse() {
			if (this._storeOptionsAsProperties) throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
			this._name = this._savedState._name;
			this._scriptPath = null;
			this.rawArgs = [];
			this._optionValues = { ...this._savedState._optionValues };
			this._optionValueSources = { ...this._savedState._optionValueSources };
			this.args = [];
			this.processedArgs = [];
		}
		/**
		* Throw if expected executable is missing. Add lots of help for author.
		*
		* @param {string} executableFile
		* @param {string} executableDir
		* @param {string} subcommandName
		*/
		_checkForMissingExecutable(executableFile, executableDir, subcommandName) {
			if (fs.existsSync(executableFile)) return;
			const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory"}`;
			throw new Error(executableMissing);
		}
		/**
		* Execute a sub-command executable.
		*
		* @private
		*/
		_executeSubCommand(subcommand, args) {
			args = args.slice();
			let launchWithNode = false;
			const sourceExt = [
				".js",
				".ts",
				".tsx",
				".mjs",
				".cjs"
			];
			function findFile(baseDir, baseName) {
				const localBin = path.resolve(baseDir, baseName);
				if (fs.existsSync(localBin)) return localBin;
				if (sourceExt.includes(path.extname(baseName))) return void 0;
				const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
				if (foundExt) return `${localBin}${foundExt}`;
			}
			this._checkForMissingMandatoryOptions();
			this._checkForConflictingOptions();
			let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
			let executableDir = this._executableDir || "";
			if (this._scriptPath) {
				let resolvedScriptPath;
				try {
					resolvedScriptPath = fs.realpathSync(this._scriptPath);
				} catch {
					resolvedScriptPath = this._scriptPath;
				}
				executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
			}
			if (executableDir) {
				let localFile = findFile(executableDir, executableFile);
				if (!localFile && !subcommand._executableFile && this._scriptPath) {
					const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
					if (legacyName !== this._name) localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
				}
				executableFile = localFile || executableFile;
			}
			launchWithNode = sourceExt.includes(path.extname(executableFile));
			let proc;
			if (process$1.platform !== "win32") if (launchWithNode) {
				args.unshift(executableFile);
				args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
				proc = childProcess.spawn(process$1.argv[0], args, { stdio: "inherit" });
			} else proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
			else {
				this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
				args.unshift(executableFile);
				args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
				proc = childProcess.spawn(process$1.execPath, args, { stdio: "inherit" });
			}
			if (!proc.killed) [
				"SIGUSR1",
				"SIGUSR2",
				"SIGTERM",
				"SIGINT",
				"SIGHUP"
			].forEach((signal) => {
				process$1.on(signal, () => {
					if (proc.killed === false && proc.exitCode === null) proc.kill(signal);
				});
			});
			const exitCallback = this._exitCallback;
			proc.on("close", (code) => {
				code = code ?? 1;
				if (!exitCallback) process$1.exit(code);
				else exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
			});
			proc.on("error", (err) => {
				if (err.code === "ENOENT") this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
				else if (err.code === "EACCES") throw new Error(`'${executableFile}' not executable`);
				if (!exitCallback) process$1.exit(1);
				else {
					const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
					wrappedError.nestedError = err;
					exitCallback(wrappedError);
				}
			});
			this.runningCommand = proc;
		}
		/**
		* @private
		*/
		_dispatchSubcommand(commandName, operands, unknown) {
			const subCommand = this._findCommand(commandName);
			if (!subCommand) this.help({ error: true });
			subCommand._prepareForParse();
			let promiseChain;
			promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
			promiseChain = this._chainOrCall(promiseChain, () => {
				if (subCommand._executableHandler) this._executeSubCommand(subCommand, operands.concat(unknown));
				else return subCommand._parseCommand(operands, unknown);
			});
			return promiseChain;
		}
		/**
		* Invoke help directly if possible, or dispatch if necessary.
		* e.g. help foo
		*
		* @private
		*/
		_dispatchHelpCommand(subcommandName) {
			if (!subcommandName) this.help();
			const subCommand = this._findCommand(subcommandName);
			if (subCommand && !subCommand._executableHandler) subCommand.help();
			return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
		}
		/**
		* Check this.args against expected this.registeredArguments.
		*
		* @private
		*/
		_checkNumberOfArguments() {
			this.registeredArguments.forEach((arg, i) => {
				if (arg.required && this.args[i] == null) this.missingArgument(arg.name());
			});
			if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) return;
			if (this.args.length > this.registeredArguments.length) this._excessArguments(this.args);
		}
		/**
		* Process this.args using this.registeredArguments and save as this.processedArgs!
		*
		* @private
		*/
		_processArguments() {
			const myParseArg = (argument, value, previous) => {
				let parsedValue = value;
				if (value !== null && argument.parseArg) {
					const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
					parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
				}
				return parsedValue;
			};
			this._checkNumberOfArguments();
			const processedArgs = [];
			this.registeredArguments.forEach((declaredArg, index) => {
				let value = declaredArg.defaultValue;
				if (declaredArg.variadic) {
					if (index < this.args.length) {
						value = this.args.slice(index);
						if (declaredArg.parseArg) value = value.reduce((processed, v) => {
							return myParseArg(declaredArg, v, processed);
						}, declaredArg.defaultValue);
					} else if (value === void 0) value = [];
				} else if (index < this.args.length) {
					value = this.args[index];
					if (declaredArg.parseArg) value = myParseArg(declaredArg, value, declaredArg.defaultValue);
				}
				processedArgs[index] = value;
			});
			this.processedArgs = processedArgs;
		}
		/**
		* Once we have a promise we chain, but call synchronously until then.
		*
		* @param {(Promise|undefined)} promise
		* @param {Function} fn
		* @return {(Promise|undefined)}
		* @private
		*/
		_chainOrCall(promise, fn) {
			if (promise?.then && typeof promise.then === "function") return promise.then(() => fn());
			return fn();
		}
		/**
		*
		* @param {(Promise|undefined)} promise
		* @param {string} event
		* @return {(Promise|undefined)}
		* @private
		*/
		_chainOrCallHooks(promise, event) {
			let result = promise;
			const hooks = [];
			this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
				hookedCommand._lifeCycleHooks[event].forEach((callback) => {
					hooks.push({
						hookedCommand,
						callback
					});
				});
			});
			if (event === "postAction") hooks.reverse();
			hooks.forEach((hookDetail) => {
				result = this._chainOrCall(result, () => {
					return hookDetail.callback(hookDetail.hookedCommand, this);
				});
			});
			return result;
		}
		/**
		*
		* @param {(Promise|undefined)} promise
		* @param {Command} subCommand
		* @param {string} event
		* @return {(Promise|undefined)}
		* @private
		*/
		_chainOrCallSubCommandHook(promise, subCommand, event) {
			let result = promise;
			if (this._lifeCycleHooks[event] !== void 0) this._lifeCycleHooks[event].forEach((hook) => {
				result = this._chainOrCall(result, () => {
					return hook(this, subCommand);
				});
			});
			return result;
		}
		/**
		* Process arguments in context of this command.
		* Returns action result, in case it is a promise.
		*
		* @private
		*/
		_parseCommand(operands, unknown) {
			const parsed = this.parseOptions(unknown);
			this._parseOptionsEnv();
			this._parseOptionsImplied();
			operands = operands.concat(parsed.operands);
			unknown = parsed.unknown;
			this.args = operands.concat(unknown);
			if (operands && this._findCommand(operands[0])) return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
			if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) return this._dispatchHelpCommand(operands[1]);
			if (this._defaultCommandName) {
				this._outputHelpIfRequested(unknown);
				return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
			}
			if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) this.help({ error: true });
			this._outputHelpIfRequested(parsed.unknown);
			this._checkForMissingMandatoryOptions();
			this._checkForConflictingOptions();
			const checkForUnknownOptions = () => {
				if (parsed.unknown.length > 0) this.unknownOption(parsed.unknown[0]);
			};
			const commandEvent = `command:${this.name()}`;
			if (this._actionHandler) {
				checkForUnknownOptions();
				this._processArguments();
				let promiseChain;
				promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
				promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
				if (this.parent) promiseChain = this._chainOrCall(promiseChain, () => {
					this.parent.emit(commandEvent, operands, unknown);
				});
				promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
				return promiseChain;
			}
			if (this.parent?.listenerCount(commandEvent)) {
				checkForUnknownOptions();
				this._processArguments();
				this.parent.emit(commandEvent, operands, unknown);
			} else if (operands.length) {
				if (this._findCommand("*")) return this._dispatchSubcommand("*", operands, unknown);
				if (this.listenerCount("command:*")) this.emit("command:*", operands, unknown);
				else if (this.commands.length) this.unknownCommand();
				else {
					checkForUnknownOptions();
					this._processArguments();
				}
			} else if (this.commands.length) {
				checkForUnknownOptions();
				this.help({ error: true });
			} else {
				checkForUnknownOptions();
				this._processArguments();
			}
		}
		/**
		* Find matching command.
		*
		* @private
		* @return {Command | undefined}
		*/
		_findCommand(name) {
			if (!name) return void 0;
			return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
		}
		/**
		* Return an option matching `arg` if any.
		*
		* @param {string} arg
		* @return {Option}
		* @package
		*/
		_findOption(arg) {
			return this.options.find((option) => option.is(arg));
		}
		/**
		* Display an error message if a mandatory option does not have a value.
		* Called after checking for help flags in leaf subcommand.
		*
		* @private
		*/
		_checkForMissingMandatoryOptions() {
			this._getCommandAndAncestors().forEach((cmd) => {
				cmd.options.forEach((anOption) => {
					if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) cmd.missingMandatoryOptionValue(anOption);
				});
			});
		}
		/**
		* Display an error message if conflicting options are used together in this.
		*
		* @private
		*/
		_checkForConflictingLocalOptions() {
			const definedNonDefaultOptions = this.options.filter((option) => {
				const optionKey = option.attributeName();
				if (this.getOptionValue(optionKey) === void 0) return false;
				return this.getOptionValueSource(optionKey) !== "default";
			});
			definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0).forEach((option) => {
				const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
				if (conflictingAndDefined) this._conflictingOption(option, conflictingAndDefined);
			});
		}
		/**
		* Display an error message if conflicting options are used together.
		* Called after checking for help flags in leaf subcommand.
		*
		* @private
		*/
		_checkForConflictingOptions() {
			this._getCommandAndAncestors().forEach((cmd) => {
				cmd._checkForConflictingLocalOptions();
			});
		}
		/**
		* Parse options from `argv` removing known options,
		* and return argv split into operands and unknown arguments.
		*
		* Side effects: modifies command by storing options. Does not reset state if called again.
		*
		* Examples:
		*
		*     argv => operands, unknown
		*     --known kkk op => [op], []
		*     op --known kkk => [op], []
		*     sub --unknown uuu op => [sub], [--unknown uuu op]
		*     sub -- --unknown uuu op => [sub --unknown uuu op], []
		*
		* @param {string[]} args
		* @return {{operands: string[], unknown: string[]}}
		*/
		parseOptions(args) {
			const operands = [];
			const unknown = [];
			let dest = operands;
			function maybeOption(arg) {
				return arg.length > 1 && arg[0] === "-";
			}
			const negativeNumberArg = (arg) => {
				if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
				return !this._getCommandAndAncestors().some((cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short)));
			};
			let activeVariadicOption = null;
			let activeGroup = null;
			let i = 0;
			while (i < args.length || activeGroup) {
				const arg = activeGroup ?? args[i++];
				activeGroup = null;
				if (arg === "--") {
					if (dest === unknown) dest.push(arg);
					dest.push(...args.slice(i));
					break;
				}
				if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
					this.emit(`option:${activeVariadicOption.name()}`, arg);
					continue;
				}
				activeVariadicOption = null;
				if (maybeOption(arg)) {
					const option = this._findOption(arg);
					if (option) {
						if (option.required) {
							const value = args[i++];
							if (value === void 0) this.optionMissingArgument(option);
							this.emit(`option:${option.name()}`, value);
						} else if (option.optional) {
							let value = null;
							if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) value = args[i++];
							this.emit(`option:${option.name()}`, value);
						} else this.emit(`option:${option.name()}`);
						activeVariadicOption = option.variadic ? option : null;
						continue;
					}
				}
				if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
					const option = this._findOption(`-${arg[1]}`);
					if (option) {
						if (option.required || option.optional && this._combineFlagAndOptionalValue) this.emit(`option:${option.name()}`, arg.slice(2));
						else {
							this.emit(`option:${option.name()}`);
							activeGroup = `-${arg.slice(2)}`;
						}
						continue;
					}
				}
				if (/^--[^=]+=/.test(arg)) {
					const index = arg.indexOf("=");
					const option = this._findOption(arg.slice(0, index));
					if (option && (option.required || option.optional)) {
						this.emit(`option:${option.name()}`, arg.slice(index + 1));
						continue;
					}
				}
				if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) dest = unknown;
				if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
					if (this._findCommand(arg)) {
						operands.push(arg);
						unknown.push(...args.slice(i));
						break;
					} else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
						operands.push(arg, ...args.slice(i));
						break;
					} else if (this._defaultCommandName) {
						unknown.push(arg, ...args.slice(i));
						break;
					}
				}
				if (this._passThroughOptions) {
					dest.push(arg, ...args.slice(i));
					break;
				}
				dest.push(arg);
			}
			return {
				operands,
				unknown
			};
		}
		/**
		* Return an object containing local option values as key-value pairs.
		*
		* @return {object}
		*/
		opts() {
			if (this._storeOptionsAsProperties) {
				const result = {};
				const len = this.options.length;
				for (let i = 0; i < len; i++) {
					const key = this.options[i].attributeName();
					result[key] = key === this._versionOptionName ? this._version : this[key];
				}
				return result;
			}
			return this._optionValues;
		}
		/**
		* Return an object containing merged local and global option values as key-value pairs.
		*
		* @return {object}
		*/
		optsWithGlobals() {
			return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
		}
		/**
		* Display error message and exit (or call exitOverride).
		*
		* @param {string} message
		* @param {object} [errorOptions]
		* @param {string} [errorOptions.code] - an id string representing the error
		* @param {number} [errorOptions.exitCode] - used with process.exit
		*/
		error(message, errorOptions) {
			this._outputConfiguration.outputError(`${message}\n`, this._outputConfiguration.writeErr);
			if (typeof this._showHelpAfterError === "string") this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
			else if (this._showHelpAfterError) {
				this._outputConfiguration.writeErr("\n");
				this.outputHelp({ error: true });
			}
			const config = errorOptions || {};
			const exitCode = config.exitCode || 1;
			const code = config.code || "commander.error";
			this._exit(exitCode, code, message);
		}
		/**
		* Apply any option related environment variables, if option does
		* not have a value from cli or client code.
		*
		* @private
		*/
		_parseOptionsEnv() {
			this.options.forEach((option) => {
				if (option.envVar && option.envVar in process$1.env) {
					const optionKey = option.attributeName();
					if (this.getOptionValue(optionKey) === void 0 || [
						"default",
						"config",
						"env"
					].includes(this.getOptionValueSource(optionKey))) if (option.required || option.optional) this.emit(`optionEnv:${option.name()}`, process$1.env[option.envVar]);
					else this.emit(`optionEnv:${option.name()}`);
				}
			});
		}
		/**
		* Apply any implied option values, if option is undefined or default value.
		*
		* @private
		*/
		_parseOptionsImplied() {
			const dualHelper = new DualOptions(this.options);
			const hasCustomOptionValue = (optionKey) => {
				return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
			};
			this.options.filter((option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
				Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
					this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
				});
			});
		}
		/**
		* Argument `name` is missing.
		*
		* @param {string} name
		* @private
		*/
		missingArgument(name) {
			const message = `error: missing required argument '${name}'`;
			this.error(message, { code: "commander.missingArgument" });
		}
		/**
		* `Option` is missing an argument.
		*
		* @param {Option} option
		* @private
		*/
		optionMissingArgument(option) {
			const message = `error: option '${option.flags}' argument missing`;
			this.error(message, { code: "commander.optionMissingArgument" });
		}
		/**
		* `Option` does not have a value, and is a mandatory option.
		*
		* @param {Option} option
		* @private
		*/
		missingMandatoryOptionValue(option) {
			const message = `error: required option '${option.flags}' not specified`;
			this.error(message, { code: "commander.missingMandatoryOptionValue" });
		}
		/**
		* `Option` conflicts with another option.
		*
		* @param {Option} option
		* @param {Option} conflictingOption
		* @private
		*/
		_conflictingOption(option, conflictingOption) {
			const findBestOptionFromValue = (option) => {
				const optionKey = option.attributeName();
				const optionValue = this.getOptionValue(optionKey);
				const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
				const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
				if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) return negativeOption;
				return positiveOption || option;
			};
			const getErrorMessage = (option) => {
				const bestOption = findBestOptionFromValue(option);
				const optionKey = bestOption.attributeName();
				if (this.getOptionValueSource(optionKey) === "env") return `environment variable '${bestOption.envVar}'`;
				return `option '${bestOption.flags}'`;
			};
			const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
			this.error(message, { code: "commander.conflictingOption" });
		}
		/**
		* Unknown option `flag`.
		*
		* @param {string} flag
		* @private
		*/
		unknownOption(flag) {
			if (this._allowUnknownOption) return;
			let suggestion = "";
			if (flag.startsWith("--") && this._showSuggestionAfterError) {
				let candidateFlags = [];
				let command = this;
				do {
					const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
					candidateFlags = candidateFlags.concat(moreFlags);
					command = command.parent;
				} while (command && !command._enablePositionalOptions);
				suggestion = suggestSimilar(flag, candidateFlags);
			}
			const message = `error: unknown option '${flag}'${suggestion}`;
			this.error(message, { code: "commander.unknownOption" });
		}
		/**
		* Excess arguments, more than expected.
		*
		* @param {string[]} receivedArgs
		* @private
		*/
		_excessArguments(receivedArgs) {
			if (this._allowExcessArguments) return;
			const expected = this.registeredArguments.length;
			const s = expected === 1 ? "" : "s";
			const message = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ""}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
			this.error(message, { code: "commander.excessArguments" });
		}
		/**
		* Unknown command.
		*
		* @private
		*/
		unknownCommand() {
			const unknownName = this.args[0];
			let suggestion = "";
			if (this._showSuggestionAfterError) {
				const candidateNames = [];
				this.createHelp().visibleCommands(this).forEach((command) => {
					candidateNames.push(command.name());
					if (command.alias()) candidateNames.push(command.alias());
				});
				suggestion = suggestSimilar(unknownName, candidateNames);
			}
			const message = `error: unknown command '${unknownName}'${suggestion}`;
			this.error(message, { code: "commander.unknownCommand" });
		}
		/**
		* Get or set the program version.
		*
		* This method auto-registers the "-V, --version" option which will print the version number.
		*
		* You can optionally supply the flags and description to override the defaults.
		*
		* @param {string} [str]
		* @param {string} [flags]
		* @param {string} [description]
		* @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
		*/
		version(str, flags, description) {
			if (str === void 0) return this._version;
			this._version = str;
			flags = flags || "-V, --version";
			description = description || "output the version number";
			const versionOption = this.createOption(flags, description);
			this._versionOptionName = versionOption.attributeName();
			this._registerOption(versionOption);
			this.on("option:" + versionOption.name(), () => {
				this._outputConfiguration.writeOut(`${str}\n`);
				this._exit(0, "commander.version", str);
			});
			return this;
		}
		/**
		* Set the description.
		*
		* @param {string} [str]
		* @param {object} [argsDescription]
		* @return {(string|Command)}
		*/
		description(str, argsDescription) {
			if (str === void 0 && argsDescription === void 0) return this._description;
			this._description = str;
			if (argsDescription) this._argsDescription = argsDescription;
			return this;
		}
		/**
		* Set the summary. Used when listed as subcommand of parent.
		*
		* @param {string} [str]
		* @return {(string|Command)}
		*/
		summary(str) {
			if (str === void 0) return this._summary;
			this._summary = str;
			return this;
		}
		/**
		* Set an alias for the command.
		*
		* You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
		*
		* @param {string} [alias]
		* @return {(string|Command)}
		*/
		alias(alias) {
			if (alias === void 0) return this._aliases[0];
			/** @type {Command} */
			let command = this;
			if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) command = this.commands[this.commands.length - 1];
			if (alias === command._name) throw new Error("Command alias can't be the same as its name");
			const matchingCommand = this.parent?._findCommand(alias);
			if (matchingCommand) {
				const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
				throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
			}
			command._aliases.push(alias);
			return this;
		}
		/**
		* Set aliases for the command.
		*
		* Only the first alias is shown in the auto-generated help.
		*
		* @param {string[]} [aliases]
		* @return {(string[]|Command)}
		*/
		aliases(aliases) {
			if (aliases === void 0) return this._aliases;
			aliases.forEach((alias) => this.alias(alias));
			return this;
		}
		/**
		* Set / get the command usage `str`.
		*
		* @param {string} [str]
		* @return {(string|Command)}
		*/
		usage(str) {
			if (str === void 0) {
				if (this._usage) return this._usage;
				const args = this.registeredArguments.map((arg) => {
					return humanReadableArgName(arg);
				});
				return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
			}
			this._usage = str;
			return this;
		}
		/**
		* Get or set the name of the command.
		*
		* @param {string} [str]
		* @return {(string|Command)}
		*/
		name(str) {
			if (str === void 0) return this._name;
			this._name = str;
			return this;
		}
		/**
		* Set/get the help group heading for this subcommand in parent command's help.
		*
		* @param {string} [heading]
		* @return {Command | string}
		*/
		helpGroup(heading) {
			if (heading === void 0) return this._helpGroupHeading ?? "";
			this._helpGroupHeading = heading;
			return this;
		}
		/**
		* Set/get the default help group heading for subcommands added to this command.
		* (This does not override a group set directly on the subcommand using .helpGroup().)
		*
		* @example
		* program.commandsGroup('Development Commands:);
		* program.command('watch')...
		* program.command('lint')...
		* ...
		*
		* @param {string} [heading]
		* @returns {Command | string}
		*/
		commandsGroup(heading) {
			if (heading === void 0) return this._defaultCommandGroup ?? "";
			this._defaultCommandGroup = heading;
			return this;
		}
		/**
		* Set/get the default help group heading for options added to this command.
		* (This does not override a group set directly on the option using .helpGroup().)
		*
		* @example
		* program
		*   .optionsGroup('Development Options:')
		*   .option('-d, --debug', 'output extra debugging')
		*   .option('-p, --profile', 'output profiling information')
		*
		* @param {string} [heading]
		* @returns {Command | string}
		*/
		optionsGroup(heading) {
			if (heading === void 0) return this._defaultOptionGroup ?? "";
			this._defaultOptionGroup = heading;
			return this;
		}
		/**
		* @param {Option} option
		* @private
		*/
		_initOptionGroup(option) {
			if (this._defaultOptionGroup && !option.helpGroupHeading) option.helpGroup(this._defaultOptionGroup);
		}
		/**
		* @param {Command} cmd
		* @private
		*/
		_initCommandGroup(cmd) {
			if (this._defaultCommandGroup && !cmd.helpGroup()) cmd.helpGroup(this._defaultCommandGroup);
		}
		/**
		* Set the name of the command from script filename, such as process.argv[1],
		* or require.main.filename, or __filename.
		*
		* (Used internally and public although not documented in README.)
		*
		* @example
		* program.nameFromFilename(require.main.filename);
		*
		* @param {string} filename
		* @return {Command}
		*/
		nameFromFilename(filename) {
			this._name = path.basename(filename, path.extname(filename));
			return this;
		}
		/**
		* Get or set the directory for searching for executable subcommands of this command.
		*
		* @example
		* program.executableDir(__dirname);
		* // or
		* program.executableDir('subcommands');
		*
		* @param {string} [path]
		* @return {(string|null|Command)}
		*/
		executableDir(path) {
			if (path === void 0) return this._executableDir;
			this._executableDir = path;
			return this;
		}
		/**
		* Return program help documentation.
		*
		* @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
		* @return {string}
		*/
		helpInformation(contextOptions) {
			const helper = this.createHelp();
			const context = this._getOutputContext(contextOptions);
			helper.prepareContext({
				error: context.error,
				helpWidth: context.helpWidth,
				outputHasColors: context.hasColors
			});
			const text = helper.formatHelp(this, helper);
			if (context.hasColors) return text;
			return this._outputConfiguration.stripColor(text);
		}
		/**
		* @typedef HelpContext
		* @type {object}
		* @property {boolean} error
		* @property {number} helpWidth
		* @property {boolean} hasColors
		* @property {function} write - includes stripColor if needed
		*
		* @returns {HelpContext}
		* @private
		*/
		_getOutputContext(contextOptions) {
			contextOptions = contextOptions || {};
			const error = !!contextOptions.error;
			let baseWrite;
			let hasColors;
			let helpWidth;
			if (error) {
				baseWrite = (str) => this._outputConfiguration.writeErr(str);
				hasColors = this._outputConfiguration.getErrHasColors();
				helpWidth = this._outputConfiguration.getErrHelpWidth();
			} else {
				baseWrite = (str) => this._outputConfiguration.writeOut(str);
				hasColors = this._outputConfiguration.getOutHasColors();
				helpWidth = this._outputConfiguration.getOutHelpWidth();
			}
			const write = (str) => {
				if (!hasColors) str = this._outputConfiguration.stripColor(str);
				return baseWrite(str);
			};
			return {
				error,
				write,
				hasColors,
				helpWidth
			};
		}
		/**
		* Output help information for this command.
		*
		* Outputs built-in help, and custom text added using `.addHelpText()`.
		*
		* @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
		*/
		outputHelp(contextOptions) {
			let deprecatedCallback;
			if (typeof contextOptions === "function") {
				deprecatedCallback = contextOptions;
				contextOptions = void 0;
			}
			const outputContext = this._getOutputContext(contextOptions);
			/** @type {HelpTextEventContext} */
			const eventContext = {
				error: outputContext.error,
				write: outputContext.write,
				command: this
			};
			this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
			this.emit("beforeHelp", eventContext);
			let helpInformation = this.helpInformation({ error: outputContext.error });
			if (deprecatedCallback) {
				helpInformation = deprecatedCallback(helpInformation);
				if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) throw new Error("outputHelp callback must return a string or a Buffer");
			}
			outputContext.write(helpInformation);
			if (this._getHelpOption()?.long) this.emit(this._getHelpOption().long);
			this.emit("afterHelp", eventContext);
			this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", eventContext));
		}
		/**
		* You can pass in flags and a description to customise the built-in help option.
		* Pass in false to disable the built-in help option.
		*
		* @example
		* program.helpOption('-?, --help' 'show help'); // customise
		* program.helpOption(false); // disable
		*
		* @param {(string | boolean)} flags
		* @param {string} [description]
		* @return {Command} `this` command for chaining
		*/
		helpOption(flags, description) {
			if (typeof flags === "boolean") {
				if (flags) {
					if (this._helpOption === null) this._helpOption = void 0;
					if (this._defaultOptionGroup) this._initOptionGroup(this._getHelpOption());
				} else this._helpOption = null;
				return this;
			}
			this._helpOption = this.createOption(flags ?? "-h, --help", description ?? "display help for command");
			if (flags || description) this._initOptionGroup(this._helpOption);
			return this;
		}
		/**
		* Lazy create help option.
		* Returns null if has been disabled with .helpOption(false).
		*
		* @returns {(Option | null)} the help option
		* @package
		*/
		_getHelpOption() {
			if (this._helpOption === void 0) this.helpOption(void 0, void 0);
			return this._helpOption;
		}
		/**
		* Supply your own option to use for the built-in help option.
		* This is an alternative to using helpOption() to customise the flags and description etc.
		*
		* @param {Option} option
		* @return {Command} `this` command for chaining
		*/
		addHelpOption(option) {
			this._helpOption = option;
			this._initOptionGroup(option);
			return this;
		}
		/**
		* Output help information and exit.
		*
		* Outputs built-in help, and custom text added using `.addHelpText()`.
		*
		* @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
		*/
		help(contextOptions) {
			this.outputHelp(contextOptions);
			let exitCode = Number(process$1.exitCode ?? 0);
			if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) exitCode = 1;
			this._exit(exitCode, "commander.help", "(outputHelp)");
		}
		/**
		* // Do a little typing to coordinate emit and listener for the help text events.
		* @typedef HelpTextEventContext
		* @type {object}
		* @property {boolean} error
		* @property {Command} command
		* @property {function} write
		*/
		/**
		* Add additional text to be displayed with the built-in help.
		*
		* Position is 'before' or 'after' to affect just this command,
		* and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
		*
		* @param {string} position - before or after built-in help
		* @param {(string | Function)} text - string to add, or a function returning a string
		* @return {Command} `this` command for chaining
		*/
		addHelpText(position, text) {
			const allowedValues = [
				"beforeAll",
				"before",
				"after",
				"afterAll"
			];
			if (!allowedValues.includes(position)) throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
			const helpEvent = `${position}Help`;
			this.on(helpEvent, (context) => {
				let helpStr;
				if (typeof text === "function") helpStr = text({
					error: context.error,
					command: context.command
				});
				else helpStr = text;
				if (helpStr) context.write(`${helpStr}\n`);
			});
			return this;
		}
		/**
		* Output help information if help flags specified
		*
		* @param {Array} args - array of options to search for help flags
		* @private
		*/
		_outputHelpIfRequested(args) {
			const helpOption = this._getHelpOption();
			if (helpOption && args.find((arg) => helpOption.is(arg))) {
				this.outputHelp();
				this._exit(0, "commander.helpDisplayed", "(outputHelp)");
			}
		}
	};
	/**
	* Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
	*
	* @param {string[]} args - array of arguments from node.execArgv
	* @returns {string[]}
	* @private
	*/
	function incrementNodeInspectorPort(args) {
		return args.map((arg) => {
			if (!arg.startsWith("--inspect")) return arg;
			let debugOption;
			let debugHost = "127.0.0.1";
			let debugPort = "9229";
			let match;
			if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) debugOption = match[1];
			else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
				debugOption = match[1];
				if (/^\d+$/.test(match[3])) debugPort = match[3];
				else debugHost = match[3];
			} else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
				debugOption = match[1];
				debugHost = match[3];
				debugPort = match[4];
			}
			if (debugOption && debugPort !== "0") return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
			return arg;
		});
	}
	/**
	* @returns {boolean | undefined}
	* @package
	*/
	function useColor() {
		if (process$1.env.NO_COLOR || process$1.env.FORCE_COLOR === "0" || process$1.env.FORCE_COLOR === "false") return false;
		if (process$1.env.FORCE_COLOR || process$1.env.CLICOLOR_FORCE !== void 0) return true;
	}
	exports.Command = Command;
	exports.useColor = useColor;
}));
var { program, createCommand, createArgument, createOption, CommanderError, InvalidArgumentError, InvalidOptionArgumentError, Command, Argument, Option, Help } = (/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports) => {
	var { Argument } = require_argument();
	var { Command } = require_command();
	var { CommanderError, InvalidArgumentError } = require_error();
	var { Help } = require_help();
	var { Option } = require_option();
	exports.program = new Command();
	exports.createCommand = (name) => new Command(name);
	exports.createOption = (flags, description) => new Option(flags, description);
	exports.createArgument = (name, description) => new Argument(name, description);
	/**
	* Expose classes
	*/
	exports.Command = Command;
	exports.Option = Option;
	exports.Argument = Argument;
	exports.Help = Help;
	exports.CommanderError = CommanderError;
	exports.InvalidArgumentError = InvalidArgumentError;
	exports.InvalidOptionArgumentError = InvalidArgumentError;
})))(), 1)).default;
//#endregion
//#region src/lib/spawn.ts
/**
* 跨平台子进程封装（替代 cross-spawn 依赖）
*
* 为什么需要这个封装：
* - Node.js 原生 spawn 在 Windows 上对 .cmd/.bat/.ps1 文件需要特殊处理
* - Windows 路径和 POSIX 路径的差异
* - 异步 API 和错误处理统一
*
* 主要改进：
* - 自动检测 Windows 上需要 shell 模式的命令
* - 统一的 Promise API
* - 支持 stdout/stderr 捕获
* - 支持超时控制
* - 详细的错误信息
*/
/**
* 在 Windows 上是否需要 shell 模式
*
* Windows 下的 .cmd、.bat、.ps1 文件不能直接被 spawn 调用，
* 必须通过 shell（cmd.exe）才能执行。
*
* @param cmd - 命令字符串
* @returns 是否需要 shell:true
*/
function needsShell(cmd) {
	if (platform() !== "win32") return false;
	return /\.(cmd|bat|ps1|com)$/i.test(cmd);
}
/**
* 执行命令行命令（Promise API）
*
* 默认行为：
* - 捕获 stdout/stderr 到字符串
* - 不打印到父进程（capture 模式）
* - 退出码非 0 不抛错，但 success=false
*
* @param cmd - 命令路径或名称
* @param options - 执行选项
* @returns 执行结果
*
* @example
*   const result = await spawnExec('magick', {
*     args: ['input.svg', 'output.png'],
*     timeoutMs: 30000,
*   })
*   if (!result.success) {
*     console.error('渲染失败:', result.stderr)
*   }
*/
async function spawnExec(cmd, options = {}) {
	const { args = [], cwd, env, capture = true, inherit = false, timeoutMs, stdin } = options;
	const stdio = inherit && !capture ? "inherit" : capture ? [
		"pipe",
		"pipe",
		"pipe"
	] : [
		"pipe",
		"inherit",
		"inherit"
	];
	return new Promise((resolve) => {
		const child = spawn(cmd, args, {
			cwd,
			env: {
				...process.env,
				...env
			},
			stdio,
			shell: needsShell(cmd),
			windowsHide: true
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		if (capture && child.stdout) child.stdout.on("data", (data) => {
			stdout += data.toString();
		});
		if (capture && child.stderr) child.stderr.on("data", (data) => {
			stderr += data.toString();
		});
		if (stdin !== void 0 && child.stdin) {
			child.stdin.write(stdin);
			child.stdin.end();
		}
		let timeoutHandle;
		if (timeoutMs !== void 0) timeoutHandle = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
			setTimeout(() => {
				if (!child.killed) child.kill("SIGKILL");
			}, 3e3);
		}, timeoutMs);
		child.on("error", (err) => {
			if (timeoutHandle) clearTimeout(timeoutHandle);
			resolve({
				success: false,
				exitCode: null,
				stdout: stdout.trim(),
				stderr: (stderr + "\n" + err.message).trim(),
				timedOut: false
			});
		});
		child.on("close", (code, signal) => {
			if (timeoutHandle) clearTimeout(timeoutHandle);
			resolve({
				success: code === 0 && !timedOut,
				exitCode: code,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				timedOut,
				signal: signal ?? void 0
			});
		});
	});
}
//#endregion
//#region src/lib/magick/core.ts
/**
* ImageMagick 统一模块 - 底层执行封装
*
* 封装 magick CLI 调用，提供跨平台的命令执行能力。
* 所有上层模块（detection/render/dimensions）都通过此模块调用 magick。
*/
/** magick 可执行文件名 */
var MAGICK_CMD = "magick";
/**
* 执行 magick 命令
*
* @param args - 命令行参数（不含 magick 本身）
* @param timeoutMs - 超时时间（默认 30 秒）
* @returns 执行结果
*/
async function execMagick(args, timeoutMs = 3e4) {
	const result = await spawnExec(MAGICK_CMD, {
		args,
		timeoutMs
	});
	return {
		success: result.success,
		stdout: result.stdout,
		stderr: result.stderr,
		exitCode: result.exitCode
	};
}
//#endregion
//#region src/lib/magick/detection.ts
/**
* ImageMagick 统一模块 - 检测与信息
*
* 功能：
* - 检测 ImageMagick 是否安装
* - 列出系统字体
* - 列出支持的图像格式
*/
/**
* 检测 ImageMagick 环境
*
* 执行 `magick -version` 获取版本信息和支持格式
*/
async function detectEnvironment() {
	const versionResult = await execMagick(["-version"], 5e3);
	if (!versionResult.success) return {
		installed: false,
		error: `无法执行 'magick -version'。${versionResult.stderr || "请确保 ImageMagick 已安装并加入 PATH"}`
	};
	const version = versionResult.stdout.match(/ImageMagick\s+(\S+)/)?.[1];
	const formatResult = await execMagick([
		"identify",
		"-list",
		"format"
	], 5e3);
	let formats;
	if (formatResult.success) formats = formatResult.stdout.split("\n").map((line) => line.trim().split(/\s+/)[0]).filter((fmt) => fmt && /^[A-Z0-9]+$/i.test(fmt)).slice(0, 50);
	return {
		installed: true,
		version,
		executable: "magick",
		formats
	};
}
/**
* 列出系统所有字体
*
* 执行 `magick identify -list font` 解析字体族名和文件路径
*/
async function listFonts$1() {
	const result = await execMagick([
		"identify",
		"-list",
		"font"
	], 1e4);
	if (!result.success) return [];
	const blocks = result.stdout.split(/^\s*Font:\s+/m).slice(1);
	const fonts = [];
	for (const block of blocks) {
		const familyMatch = block.match(/family:\s*(.+)$/m);
		const fileMatch = block.match(/glyphs:\s*(.+)$/m);
		if (familyMatch && fileMatch) fonts.push({
			family: familyMatch[1].trim(),
			file: fileMatch[1].trim()
		});
	}
	return fonts;
}
/**
* 列出支持的图像格式
*/
async function listFormats() {
	const result = await execMagick([
		"identify",
		"-list",
		"format"
	], 5e3);
	if (!result.success) return [];
	return result.stdout.split("\n").map((line) => line.trim().split(/\s+/)[0]).filter((fmt) => fmt && /^[A-Z0-9]+$/i.test(fmt)).slice(0, 100);
}
//#endregion
//#region src/lib/magick/render.ts
/**
* ImageMagick 统一模块 - SVG 渲染
*
* 功能：
* - SVG → PNG/JPEG/WebP 渲染
*/
/**
* 将 SVG 渲染为 PNG
*
* @param options - 渲染选项
* @returns 渲染结果
*/
async function renderSvg(options) {
	const { input, output, quality = 95, background = "transparent", density = "96", force = false } = options;
	const inputPath = resolve(input);
	if (!existsSync(inputPath)) return {
		success: false,
		error: `输入文件不存在: ${inputPath}`,
		exitCode: 2
	};
	const ext = extname(inputPath).toLowerCase();
	if (ext !== ".svg" && ext !== ".svgz") return {
		success: false,
		error: `输入文件不是 SVG: ${inputPath}`,
		exitCode: 2
	};
	const outputPath = resolve(output);
	if (existsSync(outputPath) && !force) return {
		success: false,
		error: `输出文件已存在: ${outputPath}（使用 force: true 或换文件名）`,
		exitCode: 2
	};
	const result = await execMagick([
		inputPath,
		"-background",
		background === "transparent" ? "none" : background,
		"-density",
		density,
		"-quality",
		String(quality),
		outputPath
	], 6e4);
	if (!result.success) return {
		success: false,
		error: `ImageMagick 渲染失败 (exit ${result.exitCode}): ${result.stderr}`,
		exitCode: result.exitCode ?? 1
	};
	return {
		success: true,
		outputFile: outputPath,
		exitCode: 0
	};
}
//#endregion
//#region src/lib/magick.ts
/**
* ImageMagick 命令封装（兼容层）
*
* 本文件保留是为了向后兼容已有的 import { magick } from '../lib/magick.js'。
* 新代码请直接使用 '../lib/magick/index.js'。
*
* 底层实现已迁移到 magick/ 模块：
* - magick/core.ts      底层 CLI 调用
* - magick/detection.ts 环境检测、字体、格式
* - magick/render.ts    SVG 渲染
* - magick/processor.ts ImageProcessor（组合注入）
* - magick/dimensions/  处理维度（几何/颜色/滤镜/艺术/格式）
*/
/**
* 检测 ImageMagick 环境（向后兼容旧 API）
*/
async function detectImageMagick() {
	return detectEnvironment();
}
/**
* 列出系统字体（向后兼容旧 API）
*/
async function listFonts(filter) {
	const allFonts = await listFonts$1();
	if (!filter) return allFonts;
	return allFonts.filter((f) => f.family.toLowerCase().includes(filter.toLowerCase()));
}
/**
* 获取环境信息（用于 info 命令）
*/
async function getInfo() {
	return detectImageMagick();
}
var magick = {
	detect: detectImageMagick,
	renderSvg,
	listFonts,
	listFormats,
	getInfo
};
//#endregion
//#region src/lib/colors.ts
/**
* 终端颜色输出工具（替代 chalk 依赖，减小打包体积）
*
* 工作原理：
* - 使用 ANSI 转义码实现颜色
* - 自动检测 TTY 环境，非 TTY 时禁用颜色（CI 友好）
* - 支持 NO_COLOR 环境变量（现代约定）
* - 支持 FORCE_COLOR 强制启用
*
* 用法：
*   import { colors } from '../lib/colors'
*   console.log(colors.green('✓ 成功'))
*   console.log(colors.bold(colors.red('✗ 失败')))
*/
var ANSI_CODES = {
	reset: [0, 0],
	bold: [1, 22],
	dim: [2, 22],
	italic: [3, 23],
	underline: [4, 24],
	inverse: [7, 27],
	strikethrough: [9, 29],
	black: [30, 39],
	red: [31, 39],
	green: [32, 39],
	yellow: [33, 39],
	blue: [34, 39],
	magenta: [35, 39],
	cyan: [36, 39],
	white: [37, 39],
	gray: [90, 39],
	redBright: [91, 39],
	greenBright: [92, 39],
	yellowBright: [93, 39],
	blueBright: [94, 39],
	magentaBright: [95, 39],
	cyanBright: [96, 39],
	bgRed: [41, 49],
	bgGreen: [42, 49],
	bgYellow: [43, 49],
	bgBlue: [44, 49]
};
/**
* 检测颜色是否应启用
*
* 启用规则：
* 1. FORCE_COLOR env 存在 → 强制启用
* 2. NO_COLOR env 存在 → 强制禁用（约定：https://no-color.org/）
* 3. stdout 不是 TTY → 禁用（通常是管道/CI 环境）
* 4. 其他情况启用
*/
function shouldEnableColors() {
	if (process.env["FORCE_COLOR"] !== void 0) return true;
	if (process.env["NO_COLOR"] !== void 0) return false;
	return Boolean(process.stdout.isTTY);
}
var ENABLED = shouldEnableColors();
/**
* 构造颜色函数（内部工具）
*
* @param openCode - 启用 ANSI 码
* @param closeCode - 关闭 ANSI 码
* @returns 字符串染色函数
*/
function makeColorFn(openCode, closeCode) {
	return (text) => {
		if (!ENABLED) return text;
		return `\x1b[${openCode}m${text}\x1b[${closeCode}m`;
	};
}
/**
* 公共颜色 API
*
* 支持的颜色与样式：
* - 样式：bold, dim, italic, underline, inverse, strikethrough
* - 前景色：black, red, green, yellow, blue, magenta, cyan, white, gray
* - 高亮色：redBright, greenBright, yellowBright, blueBright, magentaBright, cyanBright
* - 背景色：bgRed, bgGreen, bgYellow, bgBlue
*/
var colors = {
	reset: makeColorFn(...ANSI_CODES.reset),
	bold: makeColorFn(...ANSI_CODES.bold),
	dim: makeColorFn(...ANSI_CODES.dim),
	italic: makeColorFn(...ANSI_CODES.italic),
	underline: makeColorFn(...ANSI_CODES.underline),
	inverse: makeColorFn(...ANSI_CODES.inverse),
	strikethrough: makeColorFn(...ANSI_CODES.strikethrough),
	black: makeColorFn(...ANSI_CODES.black),
	red: makeColorFn(...ANSI_CODES.red),
	green: makeColorFn(...ANSI_CODES.green),
	yellow: makeColorFn(...ANSI_CODES.yellow),
	blue: makeColorFn(...ANSI_CODES.blue),
	magenta: makeColorFn(...ANSI_CODES.magenta),
	cyan: makeColorFn(...ANSI_CODES.cyan),
	white: makeColorFn(...ANSI_CODES.white),
	gray: makeColorFn(...ANSI_CODES.gray),
	redBright: makeColorFn(...ANSI_CODES.redBright),
	greenBright: makeColorFn(...ANSI_CODES.greenBright),
	yellowBright: makeColorFn(...ANSI_CODES.yellowBright),
	blueBright: makeColorFn(...ANSI_CODES.blueBright),
	magentaBright: makeColorFn(...ANSI_CODES.magentaBright),
	cyanBright: makeColorFn(...ANSI_CODES.cyanBright),
	bgRed: makeColorFn(...ANSI_CODES.bgRed),
	bgGreen: makeColorFn(...ANSI_CODES.bgGreen),
	bgYellow: makeColorFn(...ANSI_CODES.bgYellow),
	bgBlue: makeColorFn(...ANSI_CODES.bgBlue)
};
/**
* 检测当前环境是否启用颜色
*
* @returns true 表示颜色已启用
*/
function isColorEnabled() {
	return ENABLED;
}
//#endregion
//#region src/lib/logger.ts
/**
* 统一日志输出工具
*
* 用途：
* - 在终端输出彩色日志（自动适配 TTY/非 TTY）
* - 支持 --json 模式输出 JSON（供 AI 解析）
* - 支持 --quiet 模式完全静默
* - 前缀图标（✓ ✗ ⚠ ℹ）便于识别
*
* 用法：
*   const log = createLogger({ json: false, quiet: false })
*   log.info('开始处理')
*   log.success('渲染完成', { output: 'a.png' })
*   log.error('失败', { reason: '找不到 ImageMagick' })
*/
/**
* 日志级别配置表（图标 + 颜色 + stderr/stdout 选择）
*/
var LEVEL_CONFIG = {
	info: {
		icon: "ℹ",
		color: colors.blue,
		useStderr: false
	},
	success: {
		icon: "✓",
		color: colors.green,
		useStderr: false
	},
	warn: {
		icon: "⚠",
		color: colors.yellow,
		useStderr: true
	},
	error: {
		icon: "✗",
		color: colors.red,
		useStderr: true
	},
	debug: {
		icon: "·",
		color: colors.gray,
		useStderr: true
	}
};
/**
* 创建日志记录器
*
* @param options - 日志配置
* @returns 日志记录器对象
*
* @example
*   const log = createLogger({ prefix: 'render' })
*   log.info('开始', { input: 'a.svg' })
*   // 输出: ℹ [render] 开始 { input: 'a.svg' }
*/
function createLogger(options = {}) {
	const { json = false, quiet = false, debug = false, prefix } = options;
	/**
	* 通用日志写入（内部函数）
	*
	* @param level - 日志级别
	* @param message - 文本消息
	* @param data - 附加数据（可选）
	*/
	function write(level, message, data) {
		if (quiet) return;
		const config = LEVEL_CONFIG[level];
		const stream = config.useStderr ? process.stderr : process.stdout;
		if (json) {
			const payload = {
				level,
				prefix,
				message,
				...data ? { data } : {},
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			};
			stream.write(JSON.stringify(payload) + "\n");
			return;
		}
		let line = `${isColorEnabled() ? config.color(config.icon) : config.icon} ${prefix ? colors.dim(`[${prefix}] `) : ""}${message}`;
		if (data && Object.keys(data).length > 0) line += " " + colors.dim(JSON.stringify(data));
		stream.write(line + "\n");
	}
	return {
		info: (message, data) => write("info", message, data),
		success: (message, data) => write("success", message, data),
		warn: (message, data) => write("warn", message, data),
		error: (message, data) => write("error", message, data),
		debug: (message, data) => {
			if (debug) write("debug", message, data);
		},
		raw: (text) => {
			if (!quiet) process.stdout.write(text);
		}
	};
}
createLogger();
//#endregion
//#region src/bin/info.ts
/**
* imagegen-magick 环境信息检查工具
*
* 用途：
* - 检查 Node.js 版本
* - 检查 ImageMagick 是否安装
* - 报告内置字体信息
*
* 调用示例：
*   node info.mjs           # 人类可读输出
*   node info.mjs --json    # JSON 输出（供 AI 解析）
*
* 退出码规范：
* - 0: 所有核心依赖就绪
* - 1: 一般性问题
* - 3: ImageMagick 缺失（严重问题）
*/
/** 内置字体名称 */
var BUNDLED_FONT = "Cascadia Next SC NF";
var opts = new Command().name("info").description("检查 imagegen-magick 技能的运行环境").option("--json", "以 JSON 格式输出，便于 AI 解析", false).option("--quiet", "完全静默，只输出结构化结果", false).option("--debug", "显示调试信息", false).parse().opts();
var log = createLogger({
	json: opts.json,
	quiet: opts.quiet,
	debug: opts.debug
});
/**
* 主流程：收集环境信息并输出
*/
async function main() {
	log.info("正在收集环境信息...");
	const nodeVersion = process.version;
	log.debug("Node 版本检测完成", { node: nodeVersion });
	log.info("检测 ImageMagick...");
	const imInfo = await magick.detect();
	if (imInfo.installed) log.success("ImageMagick 已安装", {
		version: imInfo.version,
		executable: imInfo.executable,
		formatCount: imInfo.formats?.length ?? 0
	});
	else log.error("ImageMagick 未检测到", { reason: imInfo.error });
	const issues = [];
	if (!imInfo.installed) issues.push("ImageMagick 未安装 - 无法渲染 SVG 为 PNG");
	const envInfo = {
		node: nodeVersion,
		platform: `${process.platform} ${process.arch}`,
		imagemagick: imInfo,
		bundledFont: BUNDLED_FONT,
		issues
	};
	if (opts.json) process.stdout.write(JSON.stringify(envInfo, null, 2) + "\n");
	else {
		process.stdout.write("\n");
		process.stdout.write(colors.bold(colors.cyan("=== imagegen-magick 环境信息 ===\n\n")));
		process.stdout.write(colors.bold("🖥️  Node.js:\n"));
		process.stdout.write(`   版本: ${colors.green(nodeVersion)}\n`);
		process.stdout.write(`   平台: ${process.platform} ${process.arch}\n`);
		process.stdout.write(`   工作目录: ${process.cwd()}\n\n`);
		process.stdout.write(colors.bold("🎨 ImageMagick:\n"));
		if (imInfo.installed) {
			process.stdout.write(`   状态: ${colors.green("✓ 已安装")}\n`);
			process.stdout.write(`   版本: ${colors.green(imInfo.version ?? "未知")}\n`);
			process.stdout.write(`   命令: ${imInfo.executable}\n`);
			process.stdout.write(`   支持格式: ${imInfo.formats?.length ?? 0} 个\n`);
		} else {
			process.stdout.write(`   状态: ${colors.red("✗ 未安装")}\n`);
			process.stdout.write(`   原因: ${colors.yellow(imInfo.error ?? "未知")}\n`);
		}
		process.stdout.write("\n");
		process.stdout.write(colors.bold("🔤 内置字体:\n"));
		process.stdout.write(`   ${colors.green(BUNDLED_FONT)}\n`);
		process.stdout.write(`   字重: Regular, Bold, Light, Medium, SemiBold, ExtraLight, ExtraBold\n`);
		process.stdout.write("\n");
		if (issues.length > 0) {
			process.stdout.write(colors.bold("⚠️  发现问题:\n"));
			for (const issue of issues) process.stdout.write(`   ${colors.yellow("⚠")} ${issue}\n`);
			process.stdout.write("\n");
		} else process.stdout.write(colors.bold(colors.green("✓ 环境就绪，可以正常使用 imagegen-magick\n")));
	}
	if (!imInfo.installed) process.exit(3);
	if (issues.length > 0) process.exit(1);
	process.exit(0);
}
main().catch((err) => {
	log.error("info 命令执行失败", { error: err.message });
	if (opts.debug) console.error(err);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=info.js.map