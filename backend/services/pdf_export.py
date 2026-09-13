import io
import logging

logger = logging.getLogger('ats_resume_scorer')

def generate_combined_pdf(html_docs: dict[str, str]) -> bytes:
    try:
        from weasyprint import HTML
        documents = []
        for name, html_str in html_docs.items():
            doc = HTML(string=html_str).render()
            documents.append(doc)
        
        first_doc = documents[0]
        for other_doc in documents[1:]:
            for page in other_doc.pages:
                first_doc.pages.append(page)
                
        return first_doc.write_pdf()
    except (ImportError, OSError, Exception) as exc:
        logger.warning(f"WeasyPrint PDF engine unavailable ({exc}). Using combined HTML fallback.")
        combined_html = "\n<div style='page-break-after: always;'></div>\n".join(html_docs.values())
        return combined_html.encode('utf-8')
