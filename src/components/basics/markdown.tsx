import * as React from "react";
import * as marked from "marked-extra";
import { emojify } from "node-emoji";

import urls from "../../constants/urls";

class Markdown extends React.PureComponent<IGFMProps> {
  render() {
    return <div dangerouslySetInnerHTML={this.renderHTML()} />;
  }

  renderHTML() {
    const { source } = this.props;

    const emojified = emojify(source);
    const autolinked = autolink(emojified);
    const sanitized = sanitize(autolinked);

    let html;
    try {
      html = marked(sanitized);
    } catch (e) {
      html = `Markdown error: ${e.error}`;
    }
    return { __html: html };
  }
}

export default Markdown;

interface IGFMProps {
  source: string;
}

const autolink = (src: string) => {
  return src.replace(
    /#([0-9]+)/g,
    (match, p1) => `[${match}](${urls.itchRepo}/issues/${p1})`
  );
};

const sanitize = (src: string) => {
  return src.replace(/\n##/g, "\n\n##");
};
