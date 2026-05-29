#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { resolve } from "node:path";
import * as fs from "node:fs";
import { writeFileSync } from "node:fs";
import * as os from "node:os";
import { tmpdir } from "node:os";
import * as net from "node:net";
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
//#region node_modules/commander/lib/error.js
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
//#region node_modules/commander/lib/argument.js
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
			if (this._name.length > 3 && this._name.slice(-3) === "...") {
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
		_concatValue(value, previous) {
			if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
			return previous.concat(value);
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
				if (this.variadic) return this._concatValue(arg, previous);
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
//#region node_modules/commander/lib/help.js
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
			this.sortSubcommands = false;
			this.sortOptions = false;
			this.showGlobalOptions = false;
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
				return Math.max(max, helper.subcommandTerm(command).length);
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
				return Math.max(max, helper.optionTerm(option).length);
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
				return Math.max(max, helper.optionTerm(option).length);
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
				return Math.max(max, helper.argumentTerm(argument).length);
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
			if (extraInfo.length > 0) return `${option.description} (${extraInfo.join(", ")})`;
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
				const extraDescripton = `(${extraInfo.join(", ")})`;
				if (argument.description) return `${argument.description} ${extraDescripton}`;
				return extraDescripton;
			}
			return argument.description;
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
			const helpWidth = helper.helpWidth || 80;
			const itemIndentWidth = 2;
			const itemSeparatorWidth = 2;
			function formatItem(term, description) {
				if (description) {
					const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
					return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
				}
				return term;
			}
			function formatList(textArray) {
				return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
			}
			let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
			const commandDescription = helper.commandDescription(cmd);
			if (commandDescription.length > 0) output = output.concat([helper.wrap(commandDescription, helpWidth, 0), ""]);
			const argumentList = helper.visibleArguments(cmd).map((argument) => {
				return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
			});
			if (argumentList.length > 0) output = output.concat([
				"Arguments:",
				formatList(argumentList),
				""
			]);
			const optionList = helper.visibleOptions(cmd).map((option) => {
				return formatItem(helper.optionTerm(option), helper.optionDescription(option));
			});
			if (optionList.length > 0) output = output.concat([
				"Options:",
				formatList(optionList),
				""
			]);
			if (this.showGlobalOptions) {
				const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
					return formatItem(helper.optionTerm(option), helper.optionDescription(option));
				});
				if (globalOptionList.length > 0) output = output.concat([
					"Global Options:",
					formatList(globalOptionList),
					""
				]);
			}
			const commandList = helper.visibleCommands(cmd).map((cmd) => {
				return formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd));
			});
			if (commandList.length > 0) output = output.concat([
				"Commands:",
				formatList(commandList),
				""
			]);
			return output.join("\n");
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
		* Wrap the given string to width characters per line, with lines after the first indented.
		* Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
		*
		* @param {string} str
		* @param {number} width
		* @param {number} indent
		* @param {number} [minColumnWidth=40]
		* @return {string}
		*
		*/
		wrap(str, width, indent, minColumnWidth = 40) {
			const manualIndent = new RegExp(`[\\n][ \\f\\t\\v   -   　﻿]+`);
			if (str.match(manualIndent)) return str;
			const columnWidth = width - indent;
			if (columnWidth < minColumnWidth) return str;
			const leadingStr = str.slice(0, indent);
			const columnText = str.slice(indent).replace("\r\n", "\n");
			const indentString = " ".repeat(indent);
			const breaks = `\\s​`;
			const regex = new RegExp(`\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
			return leadingStr + (columnText.match(regex) || []).map((line, i) => {
				if (line === "\n") return "";
				return (i > 0 ? indentString : "") + line.trimEnd();
			}).join("\n");
		}
	};
	exports.Help = Help;
}));
//#endregion
//#region node_modules/commander/lib/option.js
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
		_concatValue(value, previous) {
			if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
			return previous.concat(value);
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
				if (this.variadic) return this._concatValue(arg, previous);
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
		* as a object attribute key.
		*
		* @return {string}
		*/
		attributeName() {
			return camelcase(this.name().replace(/^no-/, ""));
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
		const flagParts = flags.split(/[ |,]+/);
		if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
		longFlag = flagParts.shift();
		if (!shortFlag && /^-[^-]$/.test(longFlag)) {
			shortFlag = longFlag;
			longFlag = void 0;
		}
		return {
			shortFlag,
			longFlag
		};
	}
	exports.Option = Option;
	exports.DualOptions = DualOptions;
}));
//#endregion
//#region node_modules/commander/lib/suggestSimilar.js
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
//#region node_modules/commander/lib/command.js
var require_command = /* @__PURE__ */ __commonJSMin(((exports) => {
	var EventEmitter = __require("node:events").EventEmitter;
	var childProcess = __require("node:child_process");
	var path$1 = __require("node:path");
	var fs$1 = __require("node:fs");
	var process$1 = __require("node:process");
	var { Argument, humanReadableArgName } = require_argument();
	var { CommanderError } = require_error();
	var { Help } = require_help();
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
			this._allowExcessArguments = true;
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
			this._outputConfiguration = {
				writeOut: (str) => process$1.stdout.write(str),
				writeErr: (str) => process$1.stderr.write(str),
				getOutHelpWidth: () => process$1.stdout.isTTY ? process$1.stdout.columns : void 0,
				getErrHelpWidth: () => process$1.stderr.isTTY ? process$1.stderr.columns : void 0,
				outputError: (str, write) => write(str)
			};
			this._hidden = false;
			/** @type {(Option | null | undefined)} */
			this._helpOption = void 0;
			this._addImplicitHelpCommand = void 0;
			/** @type {Command} */
			this._helpCommand = void 0;
			this._helpConfiguration = {};
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
		*     // functions to change where being written, stdout and stderr
		*     writeOut(str)
		*     writeErr(str)
		*     // matching functions to specify width for wrapping help
		*     getOutHelpWidth()
		*     getErrHelpWidth()
		*     // functions based on what is being written out
		*     outputError(str, write) // used for displaying errors, and not used for displaying help
		*
		* @param {object} [configuration] - configuration options
		* @return {(Command | object)} `this` command for chaining, or stored configuration
		*/
		configureOutput(configuration) {
			if (configuration === void 0) return this._outputConfiguration;
			Object.assign(this._outputConfiguration, configuration);
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
		* @param {(Function|*)} [fn] - custom argument processing function
		* @param {*} [defaultValue]
		* @return {Command} `this` command for chaining
		*/
		argument(name, description, fn, defaultValue) {
			const argument = this.createArgument(name, description);
			if (typeof fn === "function") argument.default(defaultValue).argParser(fn);
			else argument.default(fn);
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
			if (previousArgument && previousArgument.variadic) throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
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
				return this;
			}
			enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
			const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
			const helpDescription = description ?? "display help for command";
			const helpCommand = this.createCommand(helpName);
			helpCommand.helpOption(false);
			if (helpArgs) helpCommand.arguments(helpArgs);
			if (helpDescription) helpCommand.description(helpDescription);
			this._addImplicitHelpCommand = true;
			this._helpCommand = helpCommand;
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
				else if (val !== null && option.variadic) val = option._concatValue(val, oldValue);
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
		*     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
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
			const userArgs = this._prepareUserArgs(argv, parseOptions);
			await this._parseCommand([], userArgs);
			return this;
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
				const localBin = path$1.resolve(baseDir, baseName);
				if (fs$1.existsSync(localBin)) return localBin;
				if (sourceExt.includes(path$1.extname(baseName))) return void 0;
				const foundExt = sourceExt.find((ext) => fs$1.existsSync(`${localBin}${ext}`));
				if (foundExt) return `${localBin}${foundExt}`;
			}
			this._checkForMissingMandatoryOptions();
			this._checkForConflictingOptions();
			let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
			let executableDir = this._executableDir || "";
			if (this._scriptPath) {
				let resolvedScriptPath;
				try {
					resolvedScriptPath = fs$1.realpathSync(this._scriptPath);
				} catch (err) {
					resolvedScriptPath = this._scriptPath;
				}
				executableDir = path$1.resolve(path$1.dirname(resolvedScriptPath), executableDir);
			}
			if (executableDir) {
				let localFile = findFile(executableDir, executableFile);
				if (!localFile && !subcommand._executableFile && this._scriptPath) {
					const legacyName = path$1.basename(this._scriptPath, path$1.extname(this._scriptPath));
					if (legacyName !== this._name) localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
				}
				executableFile = localFile || executableFile;
			}
			launchWithNode = sourceExt.includes(path$1.extname(executableFile));
			let proc;
			if (process$1.platform !== "win32") if (launchWithNode) {
				args.unshift(executableFile);
				args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
				proc = childProcess.spawn(process$1.argv[0], args, { stdio: "inherit" });
			} else proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
			else {
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
				if (err.code === "ENOENT") {
					const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
					const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
					throw new Error(executableMissing);
				} else if (err.code === "EACCES") throw new Error(`'${executableFile}' not executable`);
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
			if (promise && promise.then && typeof promise.then === "function") return promise.then(() => fn());
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
			if (this.parent && this.parent.listenerCount(commandEvent)) {
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
		* Examples:
		*
		*     argv => operands, unknown
		*     --known kkk op => [op], []
		*     op --known kkk => [op], []
		*     sub --unknown uuu op => [sub], [--unknown uuu op]
		*     sub -- --unknown uuu op => [sub --unknown uuu op], []
		*
		* @param {string[]} argv
		* @return {{operands: string[], unknown: string[]}}
		*/
		parseOptions(argv) {
			const operands = [];
			const unknown = [];
			let dest = operands;
			const args = argv.slice();
			function maybeOption(arg) {
				return arg.length > 1 && arg[0] === "-";
			}
			let activeVariadicOption = null;
			while (args.length) {
				const arg = args.shift();
				if (arg === "--") {
					if (dest === unknown) dest.push(arg);
					dest.push(...args);
					break;
				}
				if (activeVariadicOption && !maybeOption(arg)) {
					this.emit(`option:${activeVariadicOption.name()}`, arg);
					continue;
				}
				activeVariadicOption = null;
				if (maybeOption(arg)) {
					const option = this._findOption(arg);
					if (option) {
						if (option.required) {
							const value = args.shift();
							if (value === void 0) this.optionMissingArgument(option);
							this.emit(`option:${option.name()}`, value);
						} else if (option.optional) {
							let value = null;
							if (args.length > 0 && !maybeOption(args[0])) value = args.shift();
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
							args.unshift(`-${arg.slice(2)}`);
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
				if (maybeOption(arg)) dest = unknown;
				if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
					if (this._findCommand(arg)) {
						operands.push(arg);
						if (args.length > 0) unknown.push(...args);
						break;
					} else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
						operands.push(arg);
						if (args.length > 0) operands.push(...args);
						break;
					} else if (this._defaultCommandName) {
						unknown.push(arg);
						if (args.length > 0) unknown.push(...args);
						break;
					}
				}
				if (this._passThroughOptions) {
					dest.push(arg);
					if (args.length > 0) dest.push(...args);
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
			this._name = path$1.basename(filename, path$1.extname(filename));
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
			if (helper.helpWidth === void 0) helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
			return helper.formatHelp(this, helper);
		}
		/**
		* @private
		*/
		_getHelpContext(contextOptions) {
			contextOptions = contextOptions || {};
			const context = { error: !!contextOptions.error };
			let write;
			if (context.error) write = (arg) => this._outputConfiguration.writeErr(arg);
			else write = (arg) => this._outputConfiguration.writeOut(arg);
			context.write = contextOptions.write || write;
			context.command = this;
			return context;
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
			const context = this._getHelpContext(contextOptions);
			this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
			this.emit("beforeHelp", context);
			let helpInformation = this.helpInformation(context);
			if (deprecatedCallback) {
				helpInformation = deprecatedCallback(helpInformation);
				if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) throw new Error("outputHelp callback must return a string or a Buffer");
			}
			context.write(helpInformation);
			if (this._getHelpOption()?.long) this.emit(this._getHelpOption().long);
			this.emit("afterHelp", context);
			this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
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
				if (flags) this._helpOption = this._helpOption ?? void 0;
				else this._helpOption = null;
				return this;
			}
			flags = flags ?? "-h, --help";
			description = description ?? "display help for command";
			this._helpOption = this.createOption(flags, description);
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
			let exitCode = process$1.exitCode || 0;
			if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) exitCode = 1;
			this._exit(exitCode, "commander.help", "(outputHelp)");
		}
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
	exports.Command = Command;
}));
var { program: program$1, createCommand, createArgument, createOption, CommanderError, InvalidArgumentError, InvalidOptionArgumentError, Command, Argument, Option, Help } = (/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports) => {
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
//#region src/lib/platform/windows.ts
/**
* Windows Git Bash 策略
* 
* 使用 tasklist/taskkill 管理进程，命名管道 IPC，.exe 后缀
*/
var WindowsStrategy = class {
	name = "windows";
	exeSuffix = ".exe";
	installHint = "winget install yt-dlp mpv";
	async checkProcess(name) {
		const result = await exec("tasklist", ["/FI", `IMAGENAME eq ${name}.exe`], {
			timeout: 3e3,
			noShell: true
		});
		return new RegExp(`${name}\\.exe`, "i").test(result.stdout);
	}
	async killProcess(name) {
		await exec("taskkill", [
			"/F",
			"/IM",
			`${name}.exe`
		], {
			timeout: 5e3,
			noShell: true
		});
	}
	getIpcPath(name) {
		return `\\\\.\\pipe\\${name}`;
	}
	getTmpPath(file) {
		return `/tmp/${file}`;
	}
	getMiseInstallsDir() {
		return process.env.MISE_DATA_DIR ? `${process.env.MISE_DATA_DIR}/installs` : `${process.env.HOME || ""}/.mise/data/installs`;
	}
	getLocatorCommand() {
		return ["which", []];
	}
};
//#endregion
//#region src/lib/platform/linux.ts
/**
* Linux 策略
* 
* 使用 pgrep/pkill 管理进程，Unix socket IPC，无后缀
*/
var LinuxStrategy = class {
	name = "linux";
	exeSuffix = "";
	installHint = "sudo apt install yt-dlp mpv";
	async checkProcess(name) {
		return (await exec("pgrep", ["-x", name], {
			timeout: 3e3,
			noShell: true
		})).status === 0;
	}
	async killProcess(name) {
		await exec("pkill", ["-x", name], {
			timeout: 5e3,
			noShell: true
		});
	}
	getIpcPath(name) {
		return `/tmp/${name}`;
	}
	getTmpPath(file) {
		return `/tmp/${file}`;
	}
	getMiseInstallsDir() {
		return `${process.env.HOME || ""}/.mise/data/installs`;
	}
	getLocatorCommand() {
		return ["sh", ["-lc", "command -v"]];
	}
};
//#endregion
//#region src/lib/platform/macos.ts
/**
* macOS 策略
* 
* 使用 pgrep/pkill 管理进程，Unix socket IPC，无后缀
*/
var MacStrategy = class {
	name = "macos";
	exeSuffix = "";
	installHint = "brew install yt-dlp mpv";
	async checkProcess(name) {
		return (await exec("pgrep", ["-x", name], {
			timeout: 3e3,
			noShell: true
		})).status === 0;
	}
	async killProcess(name) {
		await exec("pkill", ["-x", name], {
			timeout: 5e3,
			noShell: true
		});
	}
	getIpcPath(name) {
		return `/tmp/${name}`;
	}
	getTmpPath(file) {
		return `/tmp/${file}`;
	}
	getMiseInstallsDir() {
		return `${process.env.HOME || ""}/.mise/data/installs`;
	}
	getLocatorCommand() {
		return ["sh", ["-lc", "command -v"]];
	}
};
//#endregion
//#region src/lib/platform/index.ts
/**
* 根据当前平台返回对应的策略实例
* 
* 不做 PowerShell 显式检测（PSModulePath 会被继承导致误判），
* 如果在 PowerShell 中运行，bash 命令自然报错。
*/
function createPlatformStrategy() {
	switch (process.platform) {
		case "win32": return new WindowsStrategy();
		case "linux": return new LinuxStrategy();
		case "darwin": return new MacStrategy();
		default: return new LinuxStrategy();
	}
}
var _platform = null;
/** 获取当前平台策略（单例） */
function getPlatform() {
	if (!_platform) _platform = createPlatformStrategy();
	return _platform;
}
//#endregion
//#region src/lib/utils.ts
/**
* music 技能工具函数库
* 
* 包含：
* - 跨平台命令执行（统一处理编码、窗口隐藏、输出缓冲区）
* - 依赖检查（yt-dlp、mpv 是否可用）
* - 错误输出（Markdown 格式，方便 Agent 转述）
* - 路径解析（多策略查找可执行文件）
*/
/**
* 异步执行外部命令
* 
* Windows 下默认用 bash -c 包装（支持 mise 激活），
* Linux/macOS 直接调用。noShell=true 时跳过包装。
*/
async function exec(command, args, options = {}) {
	const { timeout = 3e4, maxBuffer = 20 * 1024 * 1024, encoding = "utf8", windowsHide = true, noShell = false } = options;
	return new Promise((resolve) => {
		const spawnOptions = {
			encoding,
			windowsHide,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		};
		let actualCommand = command;
		let actualArgs = args;
		getPlatform();
		if (process.platform === "win32" && !noShell) {
			const cmdString = [command, ...args.map((a) => `"${a.replace(/"/g, "\\\"")}"`)].join(" ");
			actualCommand = "bash";
			actualArgs = ["-c", cmdString];
		}
		const child = spawn(actualCommand, actualArgs, spawnOptions);
		let stdout = "";
		let stderr = "";
		let timer = null;
		child.stdout?.on("data", (chunk) => {
			if (typeof chunk === "string") stdout += chunk;
			else stdout += chunk.toString(encoding);
			if (stdout.length + stderr.length > maxBuffer) {
				child.kill("SIGKILL");
				resolve({
					status: null,
					stdout,
					stderr,
					error: /* @__PURE__ */ new Error(`Output exceeded maxBuffer (${maxBuffer} bytes)`)
				});
			}
		});
		child.stderr?.on("data", (chunk) => {
			if (typeof chunk === "string") stderr += chunk;
			else stderr += chunk.toString(encoding);
		});
		if (timeout && timeout > 0) timer = setTimeout(() => {
			child.kill("SIGKILL");
			resolve({
				status: null,
				stdout,
				stderr,
				error: /* @__PURE__ */ new Error(`Command timed out after ${timeout}ms`)
			});
		}, timeout);
		child.on("close", (code) => {
			if (timer) clearTimeout(timer);
			resolve({
				status: code,
				stdout,
				stderr
			});
		});
		child.on("error", (err) => {
			if (timer) clearTimeout(timer);
			resolve({
				status: null,
				stdout,
				stderr,
				error: err
			});
		});
	});
}
async function commandVersionWorks(command) {
	const result = await exec(command, ["--version"], {
		timeout: 8e3,
		noShell: true
	});
	if (result.status !== 0) return false;
	return (result.stdout + result.stderr).trim().length > 0;
}
/**
* Windows 下遍历 PATH 中所有可能的可执行文件路径
*/
function windowsPathCandidates(command) {
	const pathEnv = process.env.PATH || "";
	const pathExt = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
	const extensions = path.extname(command) ? [""] : pathExt.split(";").filter(Boolean);
	const candidates = [];
	for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) for (const ext of extensions) {
		candidates.push(path.join(dir, `${command}${ext.toLowerCase()}`));
		candidates.push(path.join(dir, `${command}${ext.toUpperCase()}`));
	}
	return [...new Set(candidates)];
}
/**
* 查找 mise 安装的真实可执行文件（绕过 shim）
*/
function findMiseRealExecutable(command) {
	const platform = getPlatform();
	const installsDir = platform.getMiseInstallsDir();
	if (!fs.existsSync(installsDir)) return "";
	try {
		for (const entry of fs.readdirSync(installsDir)) {
			if (!entry.toLowerCase().includes(command.toLowerCase())) continue;
			const entryDir = path.join(installsDir, entry);
			if (!fs.statSync(entryDir).isDirectory()) continue;
			for (const ver of fs.readdirSync(entryDir)) {
				const verDir = path.join(entryDir, ver);
				if (!fs.statSync(verDir).isDirectory()) continue;
				const exeName = `${command}${platform.exeSuffix}`;
				const exePath = path.join(verDir, exeName);
				if (fs.existsSync(exePath)) return exePath;
			}
		}
	} catch {}
	return "";
}
/**
* 使用 where.exe / command -v 查找命令路径
*/
async function locatorCandidates(command) {
	const [locator, extraArgs] = getPlatform().getLocatorCommand();
	const result = await exec(locator, [...extraArgs, command], {
		timeout: 5e3,
		noShell: true
	});
	if (result.status !== 0) return [];
	return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
var resolveCache = /* @__PURE__ */ new Map();
var CACHE_FILE = path.join(os.tmpdir(), "music_executable_cache.json");
function loadPersistentCache() {
	try {
		if (fs.existsSync(CACHE_FILE)) {
			const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
			for (const [k, v] of Object.entries(data)) resolveCache.set(k, v);
		}
	} catch {}
}
function savePersistentCache() {
	try {
		fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(resolveCache)), "utf8");
	} catch {}
}
loadPersistentCache();
/**
* 解析命令路径（多策略查找）
* 
* 查找顺序：
* 1. 缓存快速验证
* 2. mise 安装目录（绕过 shim）
* 3. 直接执行 --version
* 4. locator（where.exe / command -v）
* 5. Windows PATH 遍历
*/
async function resolveExecutable(command) {
	if (resolveCache.has(command)) {
		const cached = resolveCache.get(command);
		if ((await exec(cached, ["--version"], {
			timeout: 3e3,
			noShell: true
		})).status === 0) return cached;
		resolveCache.delete(command);
	}
	let resolved = "";
	const misePath = findMiseRealExecutable(command);
	if (misePath && await commandVersionWorks(misePath)) resolved = misePath;
	if (!resolved && await commandVersionWorks(command)) resolved = command;
	if (!resolved) for (const candidate of await locatorCandidates(command)) {
		if (!candidate || path.isAbsolute(candidate) && !fs.existsSync(candidate)) continue;
		if (await commandVersionWorks(candidate)) {
			resolved = candidate;
			break;
		}
	}
	if (!resolved && process.platform === "win32") for (const candidate of windowsPathCandidates(command)) {
		if (!candidate || path.isAbsolute(candidate) && !fs.existsSync(candidate)) continue;
		if (await commandVersionWorks(candidate)) {
			resolved = candidate;
			break;
		}
	}
	if (resolved) {
		resolveCache.set(command, resolved);
		savePersistentCache();
	}
	return resolved;
}
async function checkPlaybackDependencies() {
	if (process.env.MUSIC_SKIP_DEPS === "1") return;
	const missing = [];
	if (!await resolveExecutable("yt-dlp")) missing.push("yt-dlp");
	if (!await resolveExecutable("mpv")) missing.push("mpv");
	if (missing.length > 0) {
		const platform = getPlatform();
		exitWithError(`缺失依赖：\`${missing.join("`、`")}\``, [
			"已尝试 PATH 查找和 `--version` 检查，但工具不可用。",
			"请安装缺失工具或添加到 PATH，然后重新运行命令。",
			"",
			"```bash",
			platform.installHint,
			"```"
		]);
	}
}
function exitWithError(message, details = [], code = 1) {
	const lines = [
		"## 错误",
		"",
		message
	];
	if (details.length > 0) lines.push("", ...details);
	console.error(lines.join("\n"));
	process.exit(code);
}
async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
var IPC_PATH = getPlatform().getIpcPath("music-mpv-ipc");
/**
* 控制命令对应的中文标签（用于输出展示）
*/
var LABELS = {
	"pause": "已暂停",
	"resume": "已继续播放",
	"toggle-pause": "已切换播放/暂停",
	"next": "已跳转到下一首",
	"prev": "已跳转到上一首",
	"volume-up": "音量 +10",
	"volume-down": "音量 -10",
	"mute": "已切换静音",
	"loop": "已开启单曲循环",
	"loop-off": "已关闭循环",
	"stop": "已停止播放",
	"status": "当前状态"
};
/**
* 当前 mpv 进程（用于启动后引用）
*/
var mpvProcess = null;
/**
* 检查 mpv 进程是否正在运行
*/
async function mpvIsRunning() {
	return getPlatform().checkProcess("mpv");
}
/**
* 停止所有 mpv 进程（避免多实例竞争 IPC 端口）
*/
async function killMpv() {
	await getPlatform().killProcess("mpv");
	mpvProcess = null;
}
/**
* 启动 mpv 进程并等待其 IPC 服务就绪
* 
* 参数说明：
* - --no-video：只播放音频
* - --input-ipc-server=<path>：启用 IPC 通信
* - --keep-open-pause=no：播放列表结束时自动停止进程
* - --ytdl-format=bestaudio/best：优先选择最佳音质
* - --ytdl：启用 yt-dlp hook（播放 YouTube URL）
* 
* @param args 附加参数（URL 或播放列表）
* @returns mpv 进程对象
*/
function startMpv(args = []) {
	mpvProcess = spawn("mpv", [
		"--no-video",
		"--keep-open-pause=no",
		"--ytdl-format=bestaudio/best",
		"--ytdl",
		`--input-ipc-server=${IPC_PATH}`,
		...args
	], {
		stdio: [
			"ignore",
			"ignore",
			"ignore"
		],
		detached: true,
		windowsHide: true
	});
	mpvProcess.on("error", (err) => {
		console.error(`mpv 启动失败：${err.message}`);
		mpvProcess = null;
	});
	mpvProcess.on("exit", (code, signal) => {
		mpvProcess = null;
	});
	if (mpvProcess.unref) mpvProcess.unref();
	return mpvProcess;
}
/**
* 等待 mpv 进程停止（轮询检查）
* - 最多等待 10 轮，每轮间隔 100ms，共 ~1000ms
* - 用于 stop 命令后确认进程已退出
*/
async function waitForMpvToStop() {
	for (let i = 0; i < 10; i++) {
		if (!await mpvIsRunning()) return;
		await sleep(100);
	}
}
/**
* 通过 IPC 向 mpv 发送命令并等待响应
* 
* 协议说明：
* - 请求：JSON 字符串 + \n
* - 响应：JSON 字符串 + \n（单行）
* - 超时后关闭连接，返回 ok=false
* 
* @param request 命令请求（如 { command: ['get_property', 'pause'] }）
* @param timeout 超时时间（默认 5000ms）
* @returns 发送结果（ok、response、error）
*/
async function sendIpc(request, timeout = 5e3) {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let responseBuffer = "";
		const timer = setTimeout(() => {
			socket.destroy();
			resolve({
				ok: false,
				error: "IPC 通信超时"
			});
		}, timeout);
		socket.on("connect", () => {
			const data = JSON.stringify(request) + "\n";
			socket.write(data);
		});
		socket.on("data", (chunk) => {
			responseBuffer += chunk.toString();
			const lines = responseBuffer.split("\n");
			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const parsed = JSON.parse(line);
					clearTimeout(timer);
					socket.destroy();
					resolve({
						ok: parsed.error === "success",
						response: parsed
					});
					return;
				} catch (err) {}
			}
		});
		socket.on("error", (err) => {
			clearTimeout(timer);
			resolve({
				ok: false,
				error: err.message
			});
		});
		socket.connect(IPC_PATH);
	});
}
/**
* 获取 mpv 当前播放状态
* - 调用 get_property pause
* - 如果 IPC 不可用，返回 null
* 
* @returns 'playing' | 'paused' | null
*/
async function getPlaybackStatus() {
	const result = await sendIpc({ command: ["get_property", "pause"] });
	if (!result.ok || !result.response) return null;
	return result.response.data === true ? "paused" : "playing";
}
/**
* 验证 mpv 是否真正开始播放（检查 time-pos）
* - 连续检查 10 次，每次间隔 500ms
* - 只要有一次 time-pos > 0 即认为播放成功
* 
* 用途：
* - 播放启动后调用，避免 "mpv 启动但没有声音" 的情况
* 
* @returns 是否播放成功
*/
async function verifyPlayback(timeoutMs = 15e3) {
	const maxIterations = Math.ceil(timeoutMs / 500);
	for (let i = 0; i < maxIterations; i++) {
		await sleep(500);
		const result = await sendIpc({ command: ["get_property", "time-pos"] });
		if (!result.ok || !result.response) continue;
		const pos = result.response.data;
		if (typeof pos === "number" && pos > 0) return true;
	}
	return false;
}
//#endregion
//#region src/lib/output.ts
/**
* 是否为 JSON 输出模式
* （由主入口 music.ts 设置）
*/
var jsonMode = false;
/**
* 切换 JSON 输出模式
* 
* @param enabled 是否启用 JSON 模式
*/
function setJsonMode(enabled) {
	jsonMode = enabled;
}
/**
* 获取当前 JSON 输出模式状态
* 
* @returns 是否启用 JSON 模式
*/
function getJsonMode() {
	return jsonMode;
}
/**
* ANSI 颜色代码
*/
var ANSI_COLORS = {
	reset: "\x1B[0m",
	bold: "\x1B[1m",
	dim: "\x1B[2m",
	red: "\x1B[31m",
	green: "\x1B[32m",
	yellow: "\x1B[33m",
	blue: "\x1B[34m",
	magenta: "\x1B[35m",
	cyan: "\x1B[36m",
	white: "\x1B[37m",
	gray: "\x1B[90m",
	brightRed: "\x1B[91m",
	brightGreen: "\x1B[92m",
	brightYellow: "\x1B[93m",
	brightBlue: "\x1B[94m",
	brightMagenta: "\x1B[95m",
	brightCyan: "\x1B[96m"
};
/**
* 检测当前终端是否支持颜色
* 
* 规则：
* 1. 如果 stdout 不是 TTY，禁用颜色
* 2. 如果 stdout.columns < 80，禁用颜色（窄终端）
* 3. Windows 10 1809+ 默认支持 ANSI
* 4. 其他情况启用颜色
* 
* @returns 是否支持颜色
*/
function supportsColor() {
	if (!process.stdout.isTTY) return false;
	if ((process.stdout.columns ?? 0) < 80) return false;
	if (process.platform === "win32") try {
		const ver = process.getSystemVersion?.() || "";
		return parseInt(ver.split(".")[2] || "0") >= 17763;
	} catch {
		return true;
	}
	return true;
}
/**
* 颜色开关（启动时检测一次）
*/
var colorEnabled = supportsColor();
/**
* 颜色化文本（如果支持颜色）
* 
* @param text 原始文本
* @param color ANSI 颜色代码
* @returns 颜色化后的文本（不支持颜色时返回原文本）
*/
function colorize(text, color) {
	if (!colorEnabled) return text;
	return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}
/**
* 输出成功信息
* 
* 终端格式：✓ [前缀] 消息（绿色）
* JSON 格式：{ "status": "success", "message": "..." }
* 
* @param message 消息文本
* @param prefix 前缀（默认为空）
*/
function outputSuccess(message, prefix = "") {
	if (jsonMode) console.log(JSON.stringify({
		status: "success",
		message
	}));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.log(`${colorize("✓", "green")} ${prefixText}${message}`);
	}
}
/**
* 输出错误信息
* 
* 终端格式：✗ [前缀] 消息（红色）
* JSON 格式：{ "status": "error", "message": "...", "details": [...] }
* 
* @param message 错误消息
* @param details 补充详情数组
* @param prefix 前缀（默认为空）
*/
function outputError(message, details = [], prefix = "") {
	if (jsonMode) console.error(JSON.stringify({
		status: "error",
		message,
		details
	}));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.error(`${colorize("✗", "red")} ${prefixText}${message}`);
		if (details.length > 0) details.forEach((detail) => {
			console.error(`  ${colorize("→", "gray")} ${colorize(detail, "gray")}`);
		});
	}
}
/**
* 输出状态信息
* 
* 终端格式：ℹ [前缀] 消息（蓝色）
* JSON 格式：{ "status": "info", "message": "..." }
* 
* @param message 消息文本
* @param prefix 前缀（默认为空）
*/
function outputInfo(message, prefix = "") {
	if (jsonMode) console.log(JSON.stringify({
		status: "info",
		message
	}));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.log(`${colorize("ℹ", "blue")} ${prefixText}${message}`);
	}
}
/**
* 输出动作信息（如"正在搜索..."）
* 
* 终端格式：→ [前缀] 消息（黄色）
* JSON 格式：{ "action": "..." }
* 
* @param message 消息文本
* @param prefix 前缀（默认为空）
*/
function outputAction(message, prefix = "") {
	if (jsonMode) console.log(JSON.stringify({ action: message }));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.log(`${colorize("→", "yellow")} ${prefixText}${message}`);
	}
}
/**
* 输出歌曲信息（播放前调用）
* 
* 终端格式（彩色）：
* ```
* → 正在播放
*   🎵 标题（3:45）
*   👤 艺人名
* ```
* 
* JSON 格式：
* ```json
* { "action": "play", "song": { "title": "...", "artist": "..." } }
* ```
* 
* @param info 歌曲信息（从 YTVideoInfo 转换）
*/
function outputSongInfo(info) {
	const title = info.title || "未知标题";
	const artist = info.artist || "未知艺人";
	if (jsonMode) console.log(JSON.stringify({
		action: "play",
		song: {
			title,
			artist
		}
	}));
	else {
		console.log(`${colorize("→", "yellow")} ${colorize("正在播放", "yellow")}`);
		console.log(`  ${colorize("🎵", "cyan")} ${colorize(title, "bold")}`);
		console.log(`  ${colorize("👤", "cyan")} ${colorize(artist, "white")}`);
	}
}
/**
* 输出控制命令执行结果
* 
* 终端格式：✓ 标签（如"已暂停"）
* JSON 格式：{ "action": "pause", "status": "success" }
* 
* @param action 控制命令（pause/resume/next 等）
* @param status 执行状态（"success" 或 "error"）
* @param label 用户友好的标签（如"已暂停"）
* @param extraInfo 额外信息（如当前音量百分比）
*/
function outputControlResult(action, status, label, extraInfo) {
	const defaultLabel = LABELS[action] || action;
	const displayLabel = label || defaultLabel;
	if (jsonMode) {
		const output = {
			action,
			status,
			label: displayLabel
		};
		if (extraInfo) output.extraInfo = extraInfo;
		console.log(JSON.stringify(output));
	} else if (status === "success") {
		console.log(`${colorize("✓", "green")} ${displayLabel}`);
		if (extraInfo) console.log(`  ${colorize(extraInfo, "gray")}`);
	} else console.log(`${colorize("✗", "red")} ${displayLabel}`);
}
//#endregion
//#region src/lib/ytdl.ts
/**
* 默认超时时间（毫秒）
*/
var YTDLP_TIMEOUT = 3e4;
/**
* 执行 yt-dlp 命令并返回解析后的输出
* 
* @param args yt-dlp 参数列表
* @param timeout 超时时间（默认 30_000ms）
* @returns yt-dlp 标准输出（字符串）
* @throws 命令执行失败时抛出错误
*/
async function runYtdlp(args, timeout = YTDLP_TIMEOUT) {
	const result = await exec(await resolveExecutable("yt-dlp") || "yt-dlp", args, {
		timeout,
		noShell: true
	});
	if (result.status !== 0) {
		const errorMsg = result.stderr.trim() || result.stdout.trim() || `yt-dlp 退出码 ${result.status}`;
		throw new Error(`yt-dlp 执行失败：${errorMsg}`);
	}
	return result.stdout;
}
/**
* 解析 yt-dlp 的 JSON 输出（可能是单个对象或多个 JSON lines）
* 
* yt-dlp 的 --dump-json 会输出单个 JSON 对象
* yt-dlp 的 --flat-playlist + --dump-json 会输出多行 JSON（JSON lines 格式）
* 
* @param output yt-dlp 标准输出
* @returns 解析后的 JSON 对象数组
*/
function parseYtdlpJsonLines(output) {
	if (!output.trim()) return [];
	const lines = output.split("\n").filter((line) => line.trim());
	const results = [];
	for (const line of lines) try {
		const parsed = JSON.parse(line);
		results.push(parsed);
	} catch (err) {
		continue;
	}
	return results;
}
/**
* 搜索 YouTube 歌曲（使用 yt-dlp 的 ytsearch 功能）
* 
* 参数说明：
* - ytsearch<limit>:<query>：限制返回结果数量
* - --flat-playlist：快速搜索模式（不获取完整视频信息）
* - --ignore-errors：跳过无法访问的视频
* - --no-warnings：抑制警告输出
* - --dump-json：输出 JSON 格式
* 
* @param query 搜索关键词
* @param limit 最大结果数量（默认 10）
* @returns 匹配的视频信息数组
*/
async function searchYouTube(query, limit = 10) {
	const args = [
		`ytsearch${limit}:${query}`,
		"--ignore-errors",
		"--no-warnings",
		"--flat-playlist",
		"--skip-download",
		"--playlist-end",
		String(limit),
		"--dump-json"
	];
	try {
		return parseYtdlpJsonLines(await runYtdlp(args));
	} catch (err) {
		console.error(`YouTube 搜索失败：${err.message}`);
		return [];
	}
}
/**
* 获取视频的实际音频流 URL（用于播放）
* 
* 参数说明：
* - -f bestaudio：选择最佳音质
* - -g --get-url：只输出下载 URL
* - --no-download --no-warnings
* 
* @param url 视频 URL
* @returns 音频流 URL，失败返回 null
*/
async function getAudioStreamUrl(url) {
	const args = [
		url,
		"-f",
		"bestaudio",
		"-g",
		"--get-url",
		"--no-download",
		"--no-warnings"
	];
	try {
		return (await runYtdlp(args, 6e4)).trim().split("\n")[0] || null;
	} catch (err) {
		return null;
	}
}
//#endregion
//#region src/lib/scoring.ts
/**
* 歌曲时长过滤阈值
*/
var MIN_DURATION = 60;
var MAX_DURATION = 600;
/**
* 标题匹配权重配置
*/
var SCORE_WEIGHTS = {
	titleExactMatch: 1e5,
	titlePartialMatch: 1e4,
	hasMetadata: 5e3,
	officialBonus: 2e3,
	albumBonus: 1500,
	durationMatch: 1e3,
	artistBonus: 800,
	livePenalty: -5e3,
	coverPenalty: -3e3,
	remixPenalty: -2e3
};
/**
* 标题精确匹配得分
* - 完全匹配（query 完全包含在 title 中）：+100_000
* - 部分匹配（query 的关键词出现在 title 中）：+10_000
* 
* @param query 用户输入的搜索词（可能是歌名或艺人名）
* @param title 视频标题
* @returns 匹配得分
*/
function titleMatchScore(query, title) {
	if (!title) return 0;
	const normalizedQuery = query.toLowerCase().trim();
	const normalizedTitle = title.toLowerCase();
	if (normalizedTitle.includes(normalizedQuery)) return SCORE_WEIGHTS.titleExactMatch;
	const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
	const matchedWords = queryWords.filter((word) => normalizedTitle.includes(word));
	if (matchedWords.length === queryWords.length) return SCORE_WEIGHTS.titlePartialMatch;
	if (matchedWords.length > 0) return Math.round(SCORE_WEIGHTS.titlePartialMatch * (matchedWords.length / queryWords.length));
	return 0;
}
/**
* 元数据丰富度得分
* - 有 title：+2_000
* - 有 artist/uploader：+1_500
* - 有 duration：+1_500
* 
* @param info 视频信息
* @returns 元数据得分
*/
function metadataRichnessScore(info) {
	let score = 0;
	if (info.title) score += 2e3;
	if (info.artist || info.uploader || info.channel) score += 1500;
	if (info.duration) score += 1500;
	return score;
}
/**
* 关键词加成/惩罚得分
* 
* 加成关键词：
* - official：+2_000
* - album：+1_500
* - artist, singer：+800
* 
* 惩罚关键词：
* - live, concert：-5_000
* - cover：-3_000
* - remix, remixes：-2_000
* 
* @param title 视频标题
* @returns 关键词得分（可正可负）
*/
function keywordScore(title) {
	if (!title) return 0;
	const lower = title.toLowerCase();
	let score = 0;
	if (lower.includes("official")) score += SCORE_WEIGHTS.officialBonus;
	if (lower.includes("album")) score += SCORE_WEIGHTS.albumBonus;
	if (lower.includes("artist") || lower.includes("singer")) score += SCORE_WEIGHTS.artistBonus;
	if (lower.includes("live") || lower.includes("concert")) score += SCORE_WEIGHTS.livePenalty;
	if (lower.includes("cover")) score += SCORE_WEIGHTS.coverPenalty;
	if (lower.includes("remix") || lower.includes("remixes")) score += SCORE_WEIGHTS.remixPenalty;
	return score;
}
/**
* 时长匹配得分
* - 时长在 MIN_DURATION ~ MAX_DURATION 之间：+1_000
* - 时长过短或过长：0
* 
* @param duration 时长（秒），可能不存在
* @returns 时长得分
*/
function durationScore(duration) {
	if (duration === void 0 || duration === null) return 0;
	if (duration >= MIN_DURATION && duration <= MAX_DURATION) return SCORE_WEIGHTS.durationMatch;
	return 0;
}
/**
* 计算单个视频的综合得分
* 
* @param query 用户输入的搜索词
* @param info 视频信息
* @returns 综合得分（可能为负）
*/
function calculateScore(query, info) {
	let score = 0;
	score += titleMatchScore(query, info.title || "");
	score += metadataRichnessScore(info);
	score += keywordScore(info.title || "");
	score += durationScore(info.duration);
	return score;
}
/**
* 主筛选函数：对搜索结果进行评分和排序
* 
* @param query 用户输入的搜索词
* @param results YouTube 搜索结果（通过 searchYouTube 获取）
* @param maxResults 返回的最大结果数（默认 10）
* @returns 按得分降序排列的候选列表
*/
function scoreAndRank(query, results, maxResults = 10) {
	const filtered = results.map((info) => ({
		song: info,
		score: calculateScore(query, info)
	})).filter((item) => {
		if (item.song.duration && item.song.duration < 30) return false;
		if (item.score < 1e3) return false;
		return true;
	});
	filtered.sort((a, b) => b.score - a.score);
	return filtered.slice(0, maxResults);
}
/**
* 从评分结果中提取最佳歌曲
* 
* @param scored 评分后的候选列表
* @returns 最佳歌曲，如果无候选返回 null
*/
function pickBestSong(scored) {
	if (scored.length === 0) return null;
	return {
		song: scored[0].song,
		score: scored[0].score
	};
}
/**
* 判断评分结果是否可靠（最低得分阈值）
* 
* @param best 最佳候选
* @returns 是否可靠（得分 >= 10_000）
*/
function isReliableMatch(best) {
	if (!best) return false;
	return best.score >= 1e4;
}
//#endregion
//#region src/bin/music.ts
/**
* music 技能主入口
* 
* 使用 commander 分发子命令：
* - play <query>       播放歌曲（默认命令）
* - play --artist <name> 播放艺人歌曲
* - pause              暂停
* - resume             恢复
* - toggle-pause       切换暂停
* - next               下一首
* - prev               上一首
* - volume-up          音量 +10
* - volume-down        音量 -10
* - mute               静音切换
* - loop               单曲循环
* - loop-off           关闭循环
* - stop               停止
* - status             播放状态
* 
* 全局选项：
* - --json             JSON 输出模式（供 Agent 解析）
* - --verbose          显示详细日志
* - --help             显示帮助
*/
/**
* 规范化文件路径（跨平台 temp 目录映射）
* 
* Git Bash 中 `/tmp` 会自动映射到系统 temp 目录，
* 但 Node.js 不会自动映射，需要手动替换为 os.tmpdir()。
* 
* @param filePath 原始路径
* @returns 规范化后的绝对路径
*/
function normalizeOutfile(filePath) {
	if (filePath.startsWith("/tmp/") || filePath.startsWith("/tmp\\")) return resolve(tmpdir(), filePath.slice(5));
	if (filePath === "/tmp") return tmpdir();
	return filePath;
}
/**
* 默认超时时间（毫秒）
*/
var DEFAULT_TIMEOUT = 12e4;
/**
* play 命令：播放歌曲
* 
* 流程：
* 1. 检查 yt-dlp、mpv 依赖
* 2. 搜索 YouTube（使用 query）
* 3. 评分 + 排序
* 4. 选择最佳候选
* 5. 启动 mpv 播放
* 6. 立即返回（如果指定 --outfile，后台写入歌曲信息）
* 7. Agent 稍后轮询 outfile 获取歌曲信息
*/
async function playCommand(query, options) {
	if (options.json) setJsonMode(true);
	const timeout = options.timeout || DEFAULT_TIMEOUT;
	const count = options.count || 10;
	try {
		outputAction("检查 yt-dlp 和 mpv 依赖...", "依赖检查");
		await checkPlaybackDependencies();
		outputSuccess("依赖检查通过", "依赖检查");
		outputAction(`搜索 "${query}"...`, "搜索");
		const results = await searchYouTube(query, count);
		if (results.length === 0) {
			outputError(`未找到匹配的歌曲`, [], "搜索");
			process.exit(1);
		}
		outputSuccess(`找到 ${results.length} 个候选`, "搜索");
		outputAction("评分候选歌曲...", "评分");
		const scored = scoreAndRank(query, results);
		if (scored.length === 0) {
			outputError("未找到匹配的歌曲（评分过低）", ["请尝试更具体的搜索词"], "评分");
			process.exit(1);
		}
		const bestPick = pickBestSong(scored);
		if (!bestPick) {
			outputError("无法找到匹配的歌曲", [], "评分");
			process.exit(1);
		}
		const best = bestPick.song;
		outputAction("正在启动 mpv...", "播放");
		if (await mpvIsRunning()) {
			outputAction("停止当前播放...", "播放");
			await killMpv();
			await waitForMpvToStop();
		}
		outputAction("提取音频流 URL...", "播放");
		const candidateUrl = best.id ? `https://www.youtube.com/watch?v=${best.id}` : best.webpage_url || best.url;
		if (!candidateUrl) {
			outputError("无法从搜索结果中获取视频标识", ["请尝试更具体的搜索词"], "播放");
			process.exit(1);
		}
		const directUrl = await getAudioStreamUrl(candidateUrl);
		const playbackUrl = directUrl || candidateUrl;
		if (!directUrl) outputInfo("音频 URL 提取失败，使用 YouTube URL 播放（需要 mpv 支持 yt-dl hook）", "播放");
		startMpv([playbackUrl]);
		outputAction("等待播放...", "播放");
		const verified = await verifyPlayback(timeout);
		const songInfo = {
			title: best.title || query,
			artist: best.artist || best.uploader || "未知艺人"
		};
		if (!verified) {
			outputError("播放失败（mpv 启动但无声音）", [], "播放");
			if (options.outfile) writeFileSync(normalizeOutfile(options.outfile), JSON.stringify({
				status: "failed",
				...songInfo,
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			}, null, 2));
			process.exit(1);
		}
		outputSongInfo(songInfo);
		if (options.outfile) writeFileSync(normalizeOutfile(options.outfile), JSON.stringify({
			status: "success",
			...songInfo,
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		}, null, 2));
		if (!isReliableMatch(best)) outputInfo("当前匹配度较低，可能不是最相关的歌曲", "提示");
		process.exit(0);
	} catch (err) {
		outputError(err.message || "未知错误", [], "错误");
		process.exit(1);
	}
}
/**
* 控制命令处理函数
* 
* 流程：
* 1. 检查 mpv 是否正在运行
* 2. 通过 IPC 发送控制命令
* 3. 输出执行结果（成功/失败）
*/
async function controlCommand(action, options) {
	if (options.json) setJsonMode(true);
	try {
		if (!await mpvIsRunning()) {
			outputError("mpv 未在运行", ["请先启动播放"], "状态检查");
			process.exit(1);
		}
		if (action === "stop") {
			await killMpv();
			await waitForMpvToStop();
			outputControlResult(action, "success");
			process.exit(0);
		}
		const result = await sendIpc({ command: [action.toLowerCase()] });
		if (result.error) {
			outputError(`IPC 命令失败: ${result.error}`, [], "控制");
			process.exit(1);
		}
		outputControlResult(action, "success");
		process.exit(0);
	} catch (err) {
		outputError(err.message || "未知错误", [], "错误");
		process.exit(1);
	}
}
/**
* status 命令：查询播放状态
* 
* 流程：
* 1. 检查 mpv 是否正在运行
* 2. 通过 IPC 获取状态（pause、time-pos、duration）
* 3. 输出状态信息
*/
async function statusCommand(options) {
	if (options.json) setJsonMode(true);
	try {
		if (!await mpvIsRunning()) {
			outputError("mpv 未在运行", ["请先启动播放"], "状态检查");
			process.exit(1);
		}
		const state = await getPlaybackStatus();
		if (getJsonMode()) console.log(JSON.stringify({
			status: "ok",
			state: state || "unknown"
		}, null, 2));
		else outputSuccess(`播放状态: ${state === "playing" ? "播放中" : state === "paused" ? "已暂停" : "未知"}`, "状态");
		process.exit(0);
	} catch (err) {
		outputError(err.message || "未知错误", [], "错误");
		process.exit(1);
	}
}
var program = new Command();
program.name("music").description("播放、暂停、控制在线音乐").version("1.0.0");
program.command("play [query..]", { isDefault: true }).description("播放歌曲（默认命令）").option("-j, --json", "JSON 输出模式（供 Agent 解析）", false).option("--timeout <ms>", "超时时间（毫秒）", parseInt, DEFAULT_TIMEOUT).option("--outfile <path>", "将歌曲信息写入文件").action((query, options) => {
	const queryArr = Array.isArray(query) ? query : query ? [String(query)] : [];
	const queryStr = queryArr.length > 0 ? queryArr.join(" ") : "";
	if (!queryStr) {
		outputError("请提供搜索关键词", ["用法: music play <歌曲名>"], "错误");
		process.exit(1);
	}
	playCommand(queryStr, options);
});
[
	"pause",
	"resume",
	"toggle-pause",
	"next",
	"prev",
	"volume-up",
	"volume-down",
	"mute",
	"loop",
	"loop-off",
	"stop"
].forEach((action) => {
	program.command(action).description(`执行 ${action} 控制命令`).option("-j, --json", "JSON 输出模式", false).action((options) => {
		controlCommand(action, options);
	});
});
program.command("status").description("查询播放状态").option("-j, --json", "JSON 输出模式", false).action((options) => {
	statusCommand(options);
});
program.parse();
//#endregion
export {};

//# sourceMappingURL=music.mjs.map